import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { pipeline } from 'stream/promises';
import type { Repository } from 'typeorm';
import { CloudStorageBaseService } from '../../common/services/cloud-storage-base.service';
import { FileStorageService } from '../../common/services/file-storage.service';
import { decryptText, encryptText } from '../../common/utils/encryption.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import {
  ActorType,
  AuditAction,
  DriveSettings,
  EntityType,
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationToken,
  Statement,
  User,
} from '../../entities';
import { AuditService } from '../audit/audit.service';
import { StatementsService } from '../statements/statements.service';
import type { ImportDriveFilesDto } from './dto/import-drive-files.dto';
import type { UpdateDriveSettingsDto } from './dto/update-drive-settings.dto';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const DEFAULT_SYNC_TIME = '03:00';

@Injectable()
export class GoogleDriveService extends CloudStorageBaseService<DriveSettings> {
  protected readonly logger = new Logger(GoogleDriveService.name);

  constructor(
    @InjectRepository(Integration)
    integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationToken)
    integrationTokenRepository: Repository<IntegrationToken>,
    @InjectRepository(DriveSettings)
    private readonly driveSettingsRepository: Repository<DriveSettings>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(User)
    userRepository: Repository<User>,
    private readonly statementsService: StatementsService,
    private readonly fileStorageService: FileStorageService,
    private readonly auditService: AuditService,
  ) {
    super(
      integrationRepository,
      integrationTokenRepository,
      driveSettingsRepository,
      userRepository,
    );
  }

  private getClientId() {
    return process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  }

  private getClientSecret() {
    return process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private getRedirectUri() {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '';
  }

  protected getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  }

  protected getStateSecret() {
    return process.env.GOOGLE_DRIVE_STATE_SECRET || process.env.JWT_SECRET || 'lumio-state';
  }

  protected getProvider(): IntegrationProvider {
    return IntegrationProvider.GOOGLE_DRIVE;
  }

  protected getProviderName(): string {
    return 'Google Drive';
  }

  protected getProviderRouteSegment(): string {
    return 'google-drive';
  }

  protected getSettingsRelationName(): keyof Integration {
    return 'driveSettings';
  }

  protected createSettingsRecord(integrationId: string): DriveSettings {
    return this.driveSettingsRepository.create({
      integrationId,
      folderId: null,
      folderName: null,
      syncEnabled: true,
      syncTime: DEFAULT_SYNC_TIME,
      timeZone: null,
      lastSyncAt: null,
    });
  }

  protected async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const client = this.getOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { token } = await client.getAccessToken();
    const accessToken = token || client.credentials.access_token;
    if (!accessToken) {
      throw new Error('Missing access token');
    }

    return {
      accessToken,
      expiresAt: client.credentials.expiry_date
        ? new Date(client.credentials.expiry_date)
        : undefined,
    };
  }

  protected getAuthorizationExpiredMessage(): string {
    return 'Google Drive authorization expired';
  }

  private getOAuthClient() {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google Drive OAuth is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(user: User): string {
    const client = this.getOAuthClient();

    return this.buildProviderAuthUrl(user, state =>
      client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: DRIVE_SCOPES,
        state,
      }),
    );
  }

  async handleOAuthCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    const callbackContext = await this.resolveOAuthCallbackUser<
      Pick<User, 'id' | 'workspaceId' | 'timeZone'>
    >(params, ['id', 'workspaceId', 'timeZone']);
    if ('redirectUrl' in callbackContext) {
      return callbackContext.redirectUrl;
    }

    const { redirectBase, user } = callbackContext;

    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(params.code);
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';

    if (!accessToken && !refreshToken) {
      return `${redirectBase}?status=error&reason=missing_tokens`;
    }

    const workspaceId = user.workspaceId || null;
    const { integration: existing } = await this.findIntegrationForUser(user.id);
    const savedIntegration = await this.upsertConnectedIntegration(
      existing,
      user,
      tokens.scope ? tokens.scope.split(' ') : existing?.scopes || DRIVE_SCOPES,
    );

    await this.saveEncryptedTokenRecord(existing?.token, savedIntegration.id, {
      accessToken,
      refreshToken,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    });

    let settings = existing?.driveSettings || this.createSettingsRecord(savedIntegration.id);
    settings.syncTime = settings.syncTime || DEFAULT_SYNC_TIME;
    settings.timeZone = settings.timeZone || user.timeZone || 'UTC';
    settings.syncEnabled = settings.syncEnabled ?? true;

    settings = await this.driveSettingsRepository.save(settings);

    try {
      await this.ensureDefaultFolder(savedIntegration, settings);
    } catch (error) {
      this.logger.warn(`Failed to create default Drive folder: ${error}`);
    }

    return this.buildIntegrationRedirect('connected');
  }

  private async getDriveClient(integration: Integration) {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }
    const accessToken = await this.ensureValidAccessToken(integration);
    const refreshToken = decryptText(integration.token.refreshToken);
    const client = this.getOAuthClient();
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.drive({ version: 'v3', auth: client });
  }

  private async ensureDefaultFolder(integration: Integration, settings: DriveSettings) {
    if (settings.folderId) return settings;
    const drive = await this.getDriveClient(integration);

    const response = await drive.files.create({
      requestBody: {
        name: 'Lumio',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id,name',
    });

    const folderId = response.data.id || null;
    const folderName = response.data.name || null;
    if (folderId) {
      settings.folderId = folderId;
      settings.folderName = folderName;
      return this.driveSettingsRepository.save(settings);
    }
    return settings;
  }

  async importFiles(userId: string, dto: ImportDriveFilesDto) {
    const uploadsDir = resolveUploadsDir();
    return this.importFilesWithClient({
      userId,
      fileIds: dto.fileIds,
      uploadsDir,
      getClient: integration => this.getDriveClient(integration),
      loadFile: async (drive, fileId) => {
        const meta = await drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size',
        });

        return {
          originalName: meta.data.name || `drive-file-${fileId}`,
          mimeType: meta.data.mimeType || '',
          size: meta.data.size ? Number.parseInt(meta.data.size, 10) : 0,
          getContents: async () => {
            const tempName = `${Date.now()}-${fileId}`;
            const tempPath = path.join(uploadsDir, tempName);
            const download = await drive.files.get(
              { fileId, alt: 'media' },
              { responseType: 'stream' },
            );

            await pipeline(download.data as NodeJS.ReadableStream, fs.createWriteStream(tempPath));
            try {
              return await fs.promises.readFile(tempPath);
            } finally {
              await fs.promises.unlink(tempPath).catch(() => undefined);
            }
          },
        };
      },
      importFile: (user, file) =>
        this.statementsService.create(
          user,
          user.workspaceId,
          file,
          undefined,
          undefined,
          undefined,
          false,
        ),
      getErrorMessage: error =>
        (error as any)?.response?.data?.message || (error as any)?.message || 'Import failed',
    });
  }

  private async resolveDriveFilename(
    drive: ReturnType<typeof google.drive>,
    folderId: string | null,
    fileName: string,
  ): Promise<string> {
    if (!folderId) {
      return fileName;
    }
    const escapedName = fileName.replace(/'/g, "\\'");
    const q = `name = '${escapedName}' and '${folderId}' in parents and trashed = false`;
    const res = await drive.files.list({
      q,
      spaces: 'drive',
      fields: 'files(id,name)',
      pageSize: 1,
    });
    if (res.data.files && res.data.files.length > 0) {
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      const dot = fileName.lastIndexOf('.');
      if (dot === -1) {
        return `${fileName}-${stamp}`;
      }
      return `${fileName.slice(0, dot)}-${stamp}${fileName.slice(dot)}`;
    }
    return fileName;
  }

  protected async syncIntegration(integration: Integration) {
    if (!integration.driveSettings) {
      throw new BadRequestException('Drive settings missing');
    }

    return this.runSyncWithClient({
      integration,
      settings: integration.driveSettings,
      statementRepository: this.statementRepository,
      getClient: currentIntegration => this.getDriveClient(currentIntegration),
      getStatementStream: statement => this.fileStorageService.getStatementFileStream(statement),
      uploadStatement: async ({ client, stream, fileName, mimeType, settings }) => {
        const driveName = await this.resolveDriveFilename(client, settings.folderId || null, fileName);
        await client.files.create({
          requestBody: {
            name: driveName,
            parents: settings.folderId ? [settings.folderId] : undefined,
          },
          media: {
            mimeType,
            body: stream as NodeJS.ReadableStream,
          },
          fields: 'id',
        });
      },
      saveSettings: settings => this.driveSettingsRepository.save(settings),
      createAuditEvent: uploaded =>
        this.auditService.createEvent({
          workspaceId: integration.workspaceId ?? null,
          actorType: ActorType.INTEGRATION,
          actorId: integration.connectedByUserId ?? null,
          actorLabel: 'Google Drive Sync',
          entityType: EntityType.INTEGRATION,
          entityId: integration.id,
          action: AuditAction.EXPORT,
          meta: {
            provider: IntegrationProvider.GOOGLE_DRIVE,
            uploaded,
          },
        }),
      getWarningMessage: (statementId, error) =>
        `Failed to sync statement ${statementId} to Google Drive: ${String(error)}`,
    });
  }
}
