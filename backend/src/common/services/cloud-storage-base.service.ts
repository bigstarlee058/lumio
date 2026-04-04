import * as crypto from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { decryptText, encryptText } from '../utils/encryption.util';
import { Integration, IntegrationProvider, IntegrationStatus, IntegrationToken, User } from '../../entities';

const DEFAULT_SYNC_TIME = '03:00';

export interface CloudStorageSettingsLike {
  integrationId: string;
  folderId: string | null;
  folderName: string | null;
  syncEnabled: boolean;
  syncTime: string;
  timeZone: string | null;
  lastSyncAt: Date | null;
}

type RepositoryLike<T> = {
  findOne: (args: unknown) => Promise<T | null>;
  find?: (args: unknown) => Promise<T[]>;
  save: (entity: T) => Promise<T>;
  create?: (data: Partial<T>) => T;
  delete: (criteria: unknown) => Promise<unknown>;
};

export abstract class CloudStorageBaseService<
  TSettings extends CloudStorageSettingsLike,
> {
  protected abstract readonly logger: {
    error(message: string, error?: unknown): void;
    warn(message: string): void;
  };

  constructor(
    protected readonly integrationRepository: RepositoryLike<Integration>,
    protected readonly integrationTokenRepository: RepositoryLike<IntegrationToken>,
    protected readonly settingsRepository: RepositoryLike<TSettings>,
    protected readonly userRepository: RepositoryLike<User>,
  ) {}

  protected abstract getProvider(): IntegrationProvider;

  protected abstract getProviderName(): string;

  protected abstract getProviderRouteSegment(): string;

  protected abstract getSettingsRelationName(): keyof Integration;

  protected abstract getStateSecret(): string;

  protected abstract getFrontendBaseUrl(): string;

  protected abstract createSettingsRecord(integrationId: string): TSettings;

  protected abstract refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }>;

  protected abstract getAuthorizationExpiredMessage(): string;

  protected abstract syncIntegration(integration: Integration): Promise<unknown>;

  protected buildState(payload: Record<string, unknown>): string {
    const encoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.signState(encoded);
    return `${encoded}.${signature}`;
  }

  protected parseState(state: string): Record<string, unknown> {
    const [encoded, signature] = (state || '').split('.');
    if (!encoded || !signature) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const expected = this.signState(encoded);
    if (expected !== signature) {
      throw new BadRequestException('Invalid OAuth state signature');
    }

    return JSON.parse(this.base64UrlDecode(encoded));
  }

  protected async getWorkspaceId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });

    return user?.workspaceId ?? null;
  }

  protected async findIntegrationForUser(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const where = workspaceId
      ? { workspaceId, provider: this.getProvider() }
      : { connectedByUserId: userId, provider: this.getProvider() };

    const integration = await this.integrationRepository.findOne({
      where,
      relations: ['token', this.getSettingsRelationName()],
    });

    return { integration, workspaceId };
  }

  protected async ensureIntegration(userId: string) {
    const { integration } = await this.findIntegrationForUser(userId);
    if (!integration) {
      throw new NotFoundException(`${this.getProviderName()} integration not found`);
    }

    return integration;
  }

  protected getConnectedSettings(integration: Integration): TSettings | null {
    return (integration[this.getSettingsRelationName()] as unknown as TSettings | null) || null;
  }

  async getStatus(userId: string) {
    const { integration } = await this.findIntegrationForUser(userId);
    if (!integration) {
      return { connected: false, status: IntegrationStatus.DISCONNECTED };
    }

    let status = integration.status;
    if (
      status === IntegrationStatus.CONNECTED &&
      (!integration.token?.refreshToken || !integration.token?.accessToken)
    ) {
      status = IntegrationStatus.NEEDS_REAUTH;
    }

    const settings = this.getConnectedSettings(integration);
    return {
      connected: status === IntegrationStatus.CONNECTED,
      status,
      settings: settings
        ? {
            folderId: settings.folderId,
            folderName: settings.folderName,
            syncEnabled: settings.syncEnabled,
            syncTime: settings.syncTime,
            timeZone: settings.timeZone,
            lastSyncAt: settings.lastSyncAt,
          }
        : null,
      scopes: integration.scopes || [],
    };
  }

  async disconnect(userId: string) {
    const integration = await this.ensureIntegration(userId);
    if (integration.token) {
      await this.integrationTokenRepository.delete({ integrationId: integration.id });
    }

    integration.status = IntegrationStatus.DISCONNECTED;
    await this.integrationRepository.save(integration);
    return { ok: true };
  }

  async updateSettings(
    userId: string,
    dto: Partial<Pick<TSettings, 'folderId' | 'folderName' | 'syncEnabled' | 'syncTime' | 'timeZone'>>,
  ) {
    const integration = await this.ensureIntegration(userId);
    let settings = this.getConnectedSettings(integration) || this.createSettingsRecord(integration.id);

    if (dto.folderId !== undefined) {
      settings.folderId = dto.folderId || null;
    }
    if (dto.folderName !== undefined) {
      settings.folderName = dto.folderName || null;
    }
    if (dto.syncEnabled !== undefined) {
      settings.syncEnabled = dto.syncEnabled;
    }
    if (dto.syncTime !== undefined) {
      settings.syncTime = dto.syncTime;
    }
    if (dto.timeZone !== undefined) {
      settings.timeZone = dto.timeZone || null;
    }

    settings = await this.settingsRepository.save(settings);
    return { ok: true, settings };
  }

  async getPickerToken(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const accessToken = await this.ensureValidAccessToken(integration);
    return { accessToken };
  }

  async syncDueIntegrations() {
    const integrations = await this.integrationRepository.find?.({
      where: {
        provider: this.getProvider(),
        status: IntegrationStatus.CONNECTED,
      },
      relations: ['token', this.getSettingsRelationName()],
    });

    if (!integrations?.length) {
      return;
    }

    const now = new Date();
    for (const integration of integrations) {
      const settings = this.getConnectedSettings(integration);
      if (!settings?.syncEnabled) {
        continue;
      }

      const timeZone = settings.timeZone || 'UTC';
      if (!this.shouldSyncNow(now, settings, timeZone)) {
        continue;
      }

      try {
        await this.syncIntegration(integration);
      } catch (error) {
        this.logger.error(
          `${this.getProviderName()} sync failed for integration ${integration.id}: ${error}`,
        );
      }
    }
  }

  protected async ensureValidAccessToken(integration: Integration): Promise<string> {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }

    const refreshToken = decryptText(integration.token.refreshToken || '');
    let accessToken = decryptText(integration.token.accessToken || '');
    const expiresAt = integration.token.expiresAt?.getTime() || 0;
    const shouldRefresh = !accessToken || (expiresAt && expiresAt <= Date.now() + 60 * 1000);
    if (!shouldRefresh) {
      return accessToken;
    }

    try {
      const refreshed = await this.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      integration.token.accessToken = encryptText(accessToken);
      if (refreshed.expiresAt) {
        integration.token.expiresAt = refreshed.expiresAt;
      }
      await this.integrationTokenRepository.save(integration.token);
      return accessToken;
    } catch {
      integration.status = IntegrationStatus.NEEDS_REAUTH;
      await this.integrationRepository.save(integration);
      throw new BadRequestException(this.getAuthorizationExpiredMessage());
    }
  }

  protected shouldSyncNow(now: Date, settings: CloudStorageSettingsLike, timeZone: string): boolean {
    const [hourStr, minuteStr] = (settings.syncTime || DEFAULT_SYNC_TIME).split(':');
    const syncHour = Number.parseInt(hourStr || '0', 10);
    const syncMinute = Number.parseInt(minuteStr || '0', 10);

    const nowParts = this.getTimeParts(now, timeZone);
    const lastSyncParts = settings.lastSyncAt ? this.getTimeParts(settings.lastSyncAt, timeZone) : null;
    if (lastSyncParts?.dateKey === nowParts.dateKey) {
      return false;
    }

    const nowTotal = nowParts.hour * 60 + nowParts.minute;
    const syncTotal = syncHour * 60 + syncMinute;
    return nowTotal >= syncTotal && nowTotal < syncTotal + 15;
  }

  protected getTimeParts(date: Date, timeZone: string) {
    let tz = timeZone;
    try {
      Intl.DateTimeFormat('en-US', { timeZone }).format(date);
    } catch {
      tz = 'UTC';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const lookup = (type: string) => parts.find(part => part.type === type)?.value || '00';

    return {
      dateKey: `${lookup('year')}-${lookup('month')}-${lookup('day')}`,
      hour: Number.parseInt(lookup('hour'), 10),
      minute: Number.parseInt(lookup('minute'), 10),
    };
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private signState(payload: string): string {
    const hmac = crypto.createHmac('sha256', this.getStateSecret());
    hmac.update(payload);
    return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
