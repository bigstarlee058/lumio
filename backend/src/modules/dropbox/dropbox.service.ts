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
import { validateFile } from '../../common/utils/file-validator.util';
import { normalizeFilename } from '../../common/utils/filename.util';
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

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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

    const state = this.buildState({
      userId: user.id,
      workspaceId: user.workspaceId || null,
      redirect: `${this.getFrontendBaseUrl()}/integrations/dropbox`,
    });

    const dbx = this.getDropboxClient();
    return (dbx as any).auth.getAuthenticationUrl(
      redirectUri,
      state,
      'code',
      'offline',
      undefined,
      undefined,
      true,
    );
  }

  async handleOAuthCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    const redirectBase = `${this.getFrontendBaseUrl()}/integrations/dropbox`;
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

    const integration =
      existing ||
      this.integrationRepository.create({
        provider: IntegrationProvider.DROPBOX,
        workspaceId,
        connectedByUserId: user.id,
      });

    integration.status = IntegrationStatus.CONNECTED;
    integration.scopes = ['files.content.read', 'files.content.write'];
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
    if (tokenResponse.result.expires_in) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.result.expires_in);
      tokenRecord.expiresAt = expiresAt;
    }

    if (tokenRecord.accessToken && tokenRecord.refreshToken) {
      await this.integrationTokenRepository.save(tokenRecord);
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

    return `${redirectBase}?status=connected`;
  }

  async updateSettings(userId: string, dto: UpdateDropboxSettingsDto) {
    return super.updateSettings(userId, dto);
  }

  private async getDropboxClientWithAuth(integration: Integration) {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }
    const accessToken = await this.ensureValidAccessToken(integration);
    return this.getDropboxClient(accessToken);
  }

  async getPickerToken(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const accessToken = await this.ensureValidAccessToken(integration);
    return { accessToken };
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
    const integration = await this.ensureIntegration(userId);
    const dbx = await this.getDropboxClientWithAuth(integration);
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
        const meta = await dbx.filesGetMetadata({ path: fileId });

        if (meta.result['.tag'] !== 'file') {
          results.push({
            fileId,
            status: 'error',
            message: 'Not a file',
          });
          continue;
        }

        const fileMetadata = meta.result as any;
        const size = fileMetadata.size || 0;
        if (size && Number.isFinite(size) && size > 10 * 1024 * 1024) {
          results.push({
            fileId,
            status: 'error',
            message: 'File size exceeds limit',
          });
          continue;
        }

        const originalName = normalizeFilename(fileMetadata.name || `dropbox-file-${fileId}`);
        const safeBaseName = path.basename(originalName);
        const ext = path.extname(safeBaseName).toLowerCase();

        let mimeType = 'application/octet-stream';
        if (ext === '.pdf') {
          mimeType = 'application/pdf';
        } else if (ext === '.csv') {
          mimeType = 'text/csv';
        } else if (ext === '.docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          results.push({
            fileId,
            status: 'error',
            message: `Unsupported file type: ${mimeType}`,
          });
          continue;
        }

        const fileName = `${Date.now()}-${Math.random().toString(16).slice(2, 18)}-${safeBaseName}`;
        const filePath = path.join(uploadsDir, fileName);

        const download = await dbx.filesDownload({ path: fileId });
        const binary =
          (download.result as any).fileBinary ||
          (await (download.result as any).fileBlob?.arrayBuffer());

        const buffer = Buffer.isBuffer(binary) ? binary : Buffer.from(binary);
        await fs.promises.writeFile(filePath, buffer);

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
          message: error?.error?.error_summary || error?.message || 'Import failed',
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
    const dbx = await this.getDropboxClientWithAuth(integration);
    const lastSyncAt = integration.dropboxSettings.lastSyncAt;

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

        const dropboxName = await this.resolveDropboxFilename(
          dbx,
          integration.dropboxSettings.folderId || null,
          fileName,
        );

        const uploadPath = integration.dropboxSettings.folderId
          ? `${integration.dropboxSettings.folderId}/${dropboxName}`
          : `/${dropboxName}`;

        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const contents = Buffer.concat(chunks);

        await dbx.filesUpload({
          path: uploadPath,
          contents,
          mode: { '.tag': 'add' },
          autorename: true,
        });

        uploaded += 1;
      } catch (error) {
        this.logger.warn(`Failed to sync statement ${statement.id} to Dropbox: ${error}`);
      }
    }

    integration.dropboxSettings.lastSyncAt = new Date();
    await this.dropboxSettingsRepository.save(integration.dropboxSettings);

    try {
      // Audit: record Dropbox sync/export activity.
      await this.auditService.createEvent({
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
      });
    } catch (error) {
      this.logger.warn(
        `Audit event failed for Dropbox sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      ok: true,
      uploaded,
      lastSyncAt: integration.dropboxSettings.lastSyncAt,
    };
  }
}
