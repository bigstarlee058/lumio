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
import { validateFile } from '../../common/utils/file-validator.util';
import { normalizeFilename } from '../../common/utils/filename.util';
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

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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
    const state = this.buildState({
      userId: user.id,
      workspaceId: user.workspaceId || null,
      redirect: `${this.getFrontendBaseUrl()}/integrations/google-drive`,
    });

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: DRIVE_SCOPES,
      state,
    });
  }

  async handleOAuthCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    const redirectBase = `${this.getFrontendBaseUrl()}/integrations/google-drive`;
    if (params.error) {
      return `${redirectBase}?status=error&reason=${encodeURIComponent(params.error)}`;
    }
    if (!params.code || !params.state) {
      return `${redirectBase}?status=error&reason=missing_code`;
    }

    let state: Record<string, unknown>;
    try {
      state = this.parseState(params.state);
    } catch (error) {
      return `${redirectBase}?status=error&reason=bad_state`;
    }

    const userId = typeof state.userId === 'string' ? state.userId : null;
    if (!userId) {
      return `${redirectBase}?status=error&reason=missing_user`;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId', 'timeZone'],
    });

    if (!user) {
      return `${redirectBase}?status=error&reason=user_not_found`;
    }

    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(params.code);
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';

    if (!accessToken && !refreshToken) {
      return `${redirectBase}?status=error&reason=missing_tokens`;
    }

    const workspaceId = user.workspaceId || null;
    const { integration: existing } = await this.findIntegrationForUser(user.id);

    const integration =
      existing ||
      this.integrationRepository.create({
        provider: IntegrationProvider.GOOGLE_DRIVE,
        workspaceId,
        connectedByUserId: user.id,
      });

    integration.status = IntegrationStatus.CONNECTED;
    integration.scopes = tokens.scope
      ? tokens.scope.split(' ')
      : integration.scopes || DRIVE_SCOPES;
    integration.connectedByUserId = user.id;

    const savedIntegration = await this.integrationRepository.save(integration);

    const tokenRecord =
      existing?.token ||
      this.integrationTokenRepository.create({
        integrationId: savedIntegration.id,
        accessToken: '',
        refreshToken: '',
      });

    if (accessToken) {
      tokenRecord.accessToken = encryptText(accessToken);
    }
    if (refreshToken) {
      tokenRecord.refreshToken = encryptText(refreshToken);
    }
    if (tokens.expiry_date) {
      tokenRecord.expiresAt = new Date(tokens.expiry_date);
    }

    if (tokenRecord.accessToken && tokenRecord.refreshToken) {
      await this.integrationTokenRepository.save(tokenRecord);
    }

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

    return `${redirectBase}?status=connected`;
  }

  async updateSettings(userId: string, dto: UpdateDriveSettingsDto) {
    return super.updateSettings(userId, dto);
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

  async getPickerToken(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const accessToken = await this.ensureValidAccessToken(integration);
    return { accessToken };
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
    const integration = await this.ensureIntegration(userId);
    const drive = await this.getDriveClient(integration);
    const uploadsDir = resolveUploadsDir();
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const results: Array<{
      fileId: string;
      status: 'ok' | 'error';
      message?: string;
    }> = [];

    for (const fileId of dto.fileIds) {
      try {
        const meta = await drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size',
        });

        const mimeType = meta.data.mimeType || '';
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          results.push({
            fileId,
            status: 'error',
            message: `Unsupported file type: ${mimeType}`,
          });
          continue;
        }

        const size = meta.data.size ? Number.parseInt(meta.data.size, 10) : 0;
        if (size && Number.isFinite(size) && size > 10 * 1024 * 1024) {
          results.push({
            fileId,
            status: 'error',
            message: 'File size exceeds limit',
          });
          continue;
        }

        const originalName = normalizeFilename(meta.data.name || `drive-file-${fileId}`);
        const safeBaseName = path.basename(originalName);
        const fileName = `${Date.now()}-${fileId}-${safeBaseName}`;
        const filePath = path.join(uploadsDir, fileName);

        const download = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' },
        );

        await pipeline(download.data as NodeJS.ReadableStream, fs.createWriteStream(filePath));

        const fileStats = await fs.promises.stat(filePath);
        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: safeBaseName,
          encoding: '7bit',
          mimetype: mimeType,
          size: fileStats.size,
          destination: uploadsDir,
          filename: fileName,
          path: filePath,
          buffer: Buffer.alloc(0),
        } as Express.Multer.File;

        validateFile(file);

        await this.statementsService.create(
          user,
          user.workspaceId,
          file,
          undefined,
          undefined,
          undefined,
          false,
        );

        results.push({ fileId, status: 'ok' });
      } catch (error: any) {
        results.push({
          fileId,
          status: 'error',
          message: error?.response?.data?.message || error?.message || 'Import failed',
        });
      }
    }

    return {
      ok: true,
      results,
    };
  }

  async syncNow(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const result = await this.syncIntegration(integration);
    return result;
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
    const drive = await this.getDriveClient(integration);
    const lastSyncAt = integration.driveSettings.lastSyncAt;

    const qb = this.statementRepository
      .createQueryBuilder('statement')
      .leftJoin('statement.user', 'user')
      .where('statement.deletedAt IS NULL')
      .orderBy('statement.createdAt', 'ASC');

    if (integration.workspaceId) {
      qb.andWhere('user.workspaceId = :workspaceId', {
        workspaceId: integration.workspaceId,
      });
    } else if (integration.connectedByUserId) {
      qb.andWhere('statement.userId = :userId', {
        userId: integration.connectedByUserId,
      });
    }

    if (lastSyncAt) {
      qb.andWhere('statement.createdAt > :lastSyncAt', { lastSyncAt });
    }

    const statements = await qb.getMany();
    let uploaded = 0;

    for (const statement of statements) {
      try {
        const { stream, fileName, mimeType } =
          await this.fileStorageService.getStatementFileStream(statement);
        const driveName = await this.resolveDriveFilename(
          drive,
          integration.driveSettings.folderId || null,
          fileName,
        );
        await drive.files.create({
          requestBody: {
            name: driveName,
            parents: integration.driveSettings.folderId
              ? [integration.driveSettings.folderId]
              : undefined,
          },
          media: {
            mimeType,
            body: stream as NodeJS.ReadableStream,
          },
          fields: 'id',
        });
        uploaded += 1;
      } catch (error) {
        this.logger.warn(`Failed to sync statement ${statement.id} to Google Drive: ${error}`);
      }
    }

    integration.driveSettings.lastSyncAt = new Date();
    await this.driveSettingsRepository.save(integration.driveSettings);

    try {
      // Audit: record Google Drive sync/export activity.
      await this.auditService.createEvent({
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
      });
    } catch (error) {
      this.logger.warn(
        `Audit event failed for Google Drive sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      ok: true,
      uploaded,
      lastSyncAt: integration.driveSettings.lastSyncAt,
    };
  }
}
