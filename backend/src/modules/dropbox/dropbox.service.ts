import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dropbox } from 'dropbox';
import * as fetch from 'isomorphic-fetch';
import { pipeline } from 'stream/promises';
import type { Repository } from 'typeorm';
import { CloudStorageBaseService } from '../../common/services/cloud-storage-base.service';
import { FileStorageService } from '../../common/services/file-storage.service';
import { decryptText, encryptText } from '../../common/utils/encryption.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import {
  ActorType,
  AuditAction,
  DropboxSettings,
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
import type { ImportDropboxFilesDto } from './dto/import-dropbox-files.dto';
import type { UpdateDropboxSettingsDto } from './dto/update-dropbox-settings.dto';

const DEFAULT_SYNC_TIME = '03:00';

@Injectable()
export class DropboxService extends CloudStorageBaseService<DropboxSettings> {
  protected readonly logger = new Logger(DropboxService.name);

  constructor(
    @InjectRepository(Integration)
    integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationToken)
    integrationTokenRepository: Repository<IntegrationToken>,
    @InjectRepository(DropboxSettings)
    private readonly dropboxSettingsRepository: Repository<DropboxSettings>,
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
      dropboxSettingsRepository,
      userRepository,
    );
  }

  private getClientId() {
    return process.env.DROPBOX_CLIENT_ID || '';
  }

  private getClientSecret() {
    return process.env.DROPBOX_CLIENT_SECRET || '';
  }

  private getRedirectUri() {
    return process.env.DROPBOX_REDIRECT_URI || '';
  }

  protected getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  }

  protected getStateSecret() {
    return process.env.DROPBOX_STATE_SECRET || process.env.JWT_SECRET || 'lumio-state';
  }

  protected getProvider(): IntegrationProvider {
    return IntegrationProvider.DROPBOX;
  }

  protected getProviderName(): string {
    return 'Dropbox';
  }

  protected getProviderRouteSegment(): string {
    return 'dropbox';
  }

  protected getSettingsRelationName(): keyof Integration {
    return 'dropboxSettings';
  }

  protected createSettingsRecord(integrationId: string): DropboxSettings {
    return this.dropboxSettingsRepository.create({
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
    const dbx = this.getDropboxClient();
    (dbx as any).auth.setRefreshToken(refreshToken);
    const response = await (dbx as any).auth.refreshAccessToken();

    const accessToken = response.result.access_token;
    if (!accessToken) {
      throw new Error('Missing access token');
    }

    let expiresAt: Date | undefined;
    if (response.result.expires_in) {
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + response.result.expires_in);
    }

    return { accessToken, expiresAt };
  }

  protected getAuthorizationExpiredMessage(): string {
    return 'Dropbox authorization expired';
  }

  private getDropboxClient(accessToken?: string) {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Dropbox OAuth is not configured');
    }
    return new Dropbox({
      clientId,
      clientSecret,
      accessToken,
      fetch,
    });
  }

  getAuthUrl(user: User): string {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Dropbox OAuth is not configured');
    }
    const dbx = this.getDropboxClient();

    return this.buildProviderAuthUrl(user, state =>
      (dbx as any).auth.getAuthenticationUrl(
        redirectUri,
        state,
        'code',
        'offline',
        undefined,
        undefined,
        true,
      ),
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

    const dbx = this.getDropboxClient();
    const redirectUri = this.getRedirectUri();

    let tokenResponse: any;
    try {
      tokenResponse = await (dbx as any).auth.getAccessTokenFromCode(redirectUri, params.code);
    } catch (error) {
      this.logger.error(`Dropbox token exchange failed: ${error}`);
      return `${redirectBase}?status=error&reason=token_exchange_failed`;
    }

    const accessToken = tokenResponse.result.access_token || '';
    const refreshToken = tokenResponse.result.refresh_token || '';

    if (!accessToken && !refreshToken) {
      return `${redirectBase}?status=error&reason=missing_tokens`;
    }

    const workspaceId = user.workspaceId || null;
    const { integration: existing } = await this.findIntegrationForUser(user.id);
    const savedIntegration = await this.upsertConnectedIntegration(existing, user, [
      'files.content.read',
      'files.content.write',
    ]);

    if (tokenResponse.result.expires_in) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.result.expires_in);
      await this.saveEncryptedTokenRecord(existing?.token, savedIntegration.id, {
        accessToken,
        refreshToken,
        expiresAt,
      });
    } else if (accessToken || refreshToken) {
      await this.saveEncryptedTokenRecord(existing?.token, savedIntegration.id, {
        accessToken,
        refreshToken,
      });
    }

    let settings = existing?.dropboxSettings || this.createSettingsRecord(savedIntegration.id);
    settings.syncTime = settings.syncTime || DEFAULT_SYNC_TIME;
    settings.timeZone = settings.timeZone || user.timeZone || 'UTC';
    settings.syncEnabled = settings.syncEnabled ?? true;

    settings = await this.dropboxSettingsRepository.save(settings);

    try {
      await this.ensureDefaultFolder(savedIntegration, settings);
    } catch (error) {
      this.logger.warn(`Failed to create default Dropbox folder: ${error}`);
    }

    return this.buildIntegrationRedirect('connected');
  }

  private async getDropboxClientWithAuth(integration: Integration) {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }
    const accessToken = await this.ensureValidAccessToken(integration);
    return this.getDropboxClient(accessToken);
  }

  private async ensureDefaultFolder(integration: Integration, settings: DropboxSettings) {
    if (settings.folderId) return settings;
    const dbx = await this.getDropboxClientWithAuth(integration);

    try {
      const response = await dbx.filesCreateFolderV2({
        path: '/Lumio',
        autorename: false,
      });

      const folderId = response.result.metadata.path_lower || null;
      const folderName = response.result.metadata.name || null;
      if (folderId) {
        settings.folderId = folderId;
        settings.folderName = folderName;
        return this.dropboxSettingsRepository.save(settings);
      }
    } catch (error: any) {
      if (error?.error?.error_summary?.includes('path/conflict/folder')) {
        settings.folderId = '/lumio';
        settings.folderName = 'Lumio';
        return this.dropboxSettingsRepository.save(settings);
      }
      throw error;
    }
    return settings;
  }

  async importFiles(userId: string, dto: ImportDropboxFilesDto) {
    const uploadsDir = resolveUploadsDir();
    return this.importFilesWithClient({
      userId,
      fileIds: dto.fileIds,
      uploadsDir,
      getClient: integration => this.getDropboxClientWithAuth(integration),
      loadFile: async (dbx, fileId) => {
        const meta = await dbx.filesGetMetadata({ path: fileId });

        if (meta.result['.tag'] !== 'file') {
          return {
            result: this.buildImportResult(fileId, 'error', 'Not a file'),
          };
        }

        const fileMetadata = meta.result as any;
        const originalName = fileMetadata.name || `dropbox-file-${fileId}`;
        const ext = path.extname(path.basename(originalName)).toLowerCase();

        let mimeType = 'application/octet-stream';
        if (ext === '.pdf') {
          mimeType = 'application/pdf';
        } else if (ext === '.csv') {
          mimeType = 'text/csv';
        } else if (ext === '.docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        return {
          originalName,
          mimeType,
          size: fileMetadata.size || 0,
          getContents: async () => {
            const download = await dbx.filesDownload({ path: fileId });
            const binary =
              (download.result as any).fileBinary ||
              (await (download.result as any).fileBlob?.arrayBuffer());

            return Buffer.isBuffer(binary) ? binary : Buffer.from(binary);
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
        (error as any)?.error?.error_summary || (error as any)?.message || 'Import failed',
    });
  }

  private async resolveDropboxFilename(
    dbx: Dropbox,
    folderId: string | null,
    fileName: string,
  ): Promise<string> {
    if (!folderId) {
      return fileName;
    }
    const filePath = `${folderId}/${fileName}`;
    try {
      await dbx.filesGetMetadata({ path: filePath });
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      const dot = fileName.lastIndexOf('.');
      if (dot === -1) {
        return `${fileName}-${stamp}`;
      }
      return `${fileName.slice(0, dot)}-${stamp}${fileName.slice(dot)}`;
    } catch (error: any) {
      if (error?.error?.error_summary?.includes('path/not_found')) {
        return fileName;
      }
      throw error;
    }
  }

  protected async syncIntegration(integration: Integration) {
    if (!integration.dropboxSettings) {
      throw new BadRequestException('Dropbox settings missing');
    }

    return this.runSyncWithClient({
      integration,
      settings: integration.dropboxSettings,
      statementRepository: this.statementRepository,
      getClient: currentIntegration => this.getDropboxClientWithAuth(currentIntegration),
      getStatementStream: statement => this.fileStorageService.getStatementFileStream(statement),
      uploadStatement: async ({ client, stream, fileName, settings }) => {
        const dropboxName = await this.resolveDropboxFilename(
          client,
          settings.folderId || null,
          fileName,
        );

        const uploadPath = settings.folderId ? `${settings.folderId}/${dropboxName}` : `/${dropboxName}`;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }

        await client.filesUpload({
          path: uploadPath,
          contents: Buffer.concat(chunks),
          mode: { '.tag': 'add' },
          autorename: true,
        });
      },
      saveSettings: settings => this.dropboxSettingsRepository.save(settings),
      createAuditEvent: uploaded =>
        this.auditService.createEvent({
          workspaceId: integration.workspaceId ?? null,
          actorType: ActorType.INTEGRATION,
          actorId: integration.connectedByUserId ?? null,
          actorLabel: 'Dropbox Sync',
          entityType: EntityType.INTEGRATION,
          entityId: integration.id,
          action: AuditAction.EXPORT,
          meta: {
            provider: IntegrationProvider.DROPBOX,
            uploaded,
          },
        }),
      getWarningMessage: (statementId, error) =>
        `Failed to sync statement ${statementId} to Dropbox: ${String(error)}`,
    });
  }
}
