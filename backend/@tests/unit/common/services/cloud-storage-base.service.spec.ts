import { BadRequestException } from '@nestjs/common';
import { encryptText } from '@/common/utils/encryption.util';
import type { DropboxSettings } from '@/entities/dropbox-settings.entity';
import { IntegrationProvider, IntegrationStatus, type Integration } from '@/entities/integration.entity';
import type { IntegrationToken } from '@/entities/integration-token.entity';
import type { User } from '@/entities/user.entity';
import {
  CloudStorageBaseService,
  type CloudStorageSettingsLike,
} from '@/common/services/cloud-storage-base.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    create: jest.fn((data: Partial<T>) => data as T),
    delete: jest.fn(),
  } as any;
}

type TestSettings = CloudStorageSettingsLike & Partial<DropboxSettings>;

class TestCloudStorageService extends CloudStorageBaseService<TestSettings> {
  public readonly refreshAccessTokenMock = jest.fn();
  public readonly syncIntegrationMock = jest.fn();
  protected readonly logger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  constructor(
    integrationRepository: any,
    integrationTokenRepository: any,
    settingsRepository: any,
    userRepository: any,
  ) {
    super(integrationRepository, integrationTokenRepository, settingsRepository, userRepository);
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

  protected getStateSecret(): string {
    return 'test-secret';
  }

  protected getFrontendBaseUrl(): string {
    return 'https://app.example.com';
  }

  protected createSettingsRecord(integrationId: string): TestSettings {
    return {
      integrationId,
      folderId: null,
      folderName: null,
      syncEnabled: true,
      syncTime: '03:00',
      timeZone: null,
      lastSyncAt: null,
    };
  }

  protected async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    return this.refreshAccessTokenMock(refreshToken);
  }

  protected getAuthorizationExpiredMessage(): string {
    return 'Dropbox authorization expired';
  }

  protected async syncIntegration(integration: Integration) {
    return this.syncIntegrationMock(integration);
  }

  exposeBuildState(payload: Record<string, unknown>) {
    return this.buildState(payload);
  }

  exposeParseState(state: string) {
    return this.parseState(state);
  }
}

describe('CloudStorageBaseService', () => {
  const integrationRepository = createRepoMock<Integration>();
  const integrationTokenRepository = createRepoMock<IntegrationToken>();
  const settingsRepository = createRepoMock<TestSettings>();
  const userRepository = createRepoMock<User>();
  let service: TestCloudStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestCloudStorageService(
      integrationRepository,
      integrationTokenRepository,
      settingsRepository,
      userRepository,
    );
  });

  it('builds and parses signed OAuth state', () => {
    const state = service.exposeBuildState({ userId: 'user-1', workspaceId: 'ws-1' });

    expect(service.exposeParseState(state)).toEqual({
      userId: 'user-1',
      workspaceId: 'ws-1',
    });
  });

  it('rejects OAuth state with invalid signature', () => {
    const state = service.exposeBuildState({ userId: 'user-1' });
    const [payload] = state.split('.');

    expect(() => service.exposeParseState(`${payload}.invalid`)).toThrow(BadRequestException);
  });

  it('marks connected integrations without required tokens as needing reauth', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token: { accessToken: null, refreshToken: 'encrypted-refresh' },
      dropboxSettings: {
        folderId: '/lumio',
        folderName: 'Lumio',
        syncEnabled: true,
        syncTime: '03:00',
        timeZone: 'UTC',
        lastSyncAt: null,
      },
    });

    await expect(service.getStatus('user-1')).resolves.toEqual({
      connected: false,
      status: IntegrationStatus.NEEDS_REAUTH,
      settings: {
        folderId: '/lumio',
        folderName: 'Lumio',
        syncEnabled: true,
        syncTime: '03:00',
        timeZone: 'UTC',
        lastSyncAt: null,
      },
      scopes: [],
    });
  });

  it('disconnects the integration and deletes its token', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token: { integrationId: 'integration-1' },
      dropboxSettings: null,
    });

    await expect(service.disconnect('user-1')).resolves.toEqual({ ok: true });
    expect(integrationTokenRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
    expect(integrationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'integration-1',
        status: IntegrationStatus.DISCONNECTED,
      }),
    );
  });

  it('returns picker token after refreshing an expired access token', async () => {
    const token = {
      integrationId: 'integration-1',
      accessToken: encryptText('expired-access'),
      refreshToken: encryptText('refresh-1'),
      expiresAt: new Date(Date.now() - 60_000),
    };

    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token,
      dropboxSettings: null,
    });
    service.refreshAccessTokenMock.mockResolvedValue({
      accessToken: 'fresh-access',
      expiresAt: new Date('2026-04-05T00:00:00.000Z'),
    });

    await expect(service.getPickerToken('user-1')).resolves.toEqual({ accessToken: 'fresh-access' });
    expect(service.refreshAccessTokenMock).toHaveBeenCalledWith('refresh-1');
    expect(integrationTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: expect.any(String),
        expiresAt: new Date('2026-04-05T00:00:00.000Z'),
      }),
    );
  });

  it('syncs only integrations that are enabled and due in the current sync window', async () => {
    integrationRepository.find.mockResolvedValue([
      {
        id: 'due',
        provider: IntegrationProvider.DROPBOX,
        status: IntegrationStatus.CONNECTED,
        dropboxSettings: {
          syncEnabled: true,
          syncTime: '03:00',
          timeZone: 'UTC',
          lastSyncAt: new Date('2026-04-03T00:00:00.000Z'),
        },
      },
      {
        id: 'disabled',
        provider: IntegrationProvider.DROPBOX,
        status: IntegrationStatus.CONNECTED,
        dropboxSettings: {
          syncEnabled: false,
          syncTime: '03:00',
          timeZone: 'UTC',
          lastSyncAt: null,
        },
      },
      {
        id: 'already-synced',
        provider: IntegrationProvider.DROPBOX,
        status: IntegrationStatus.CONNECTED,
        dropboxSettings: {
          syncEnabled: true,
          syncTime: '03:00',
          timeZone: 'UTC',
          lastSyncAt: new Date('2026-04-04T01:00:00.000Z'),
        },
      },
    ]);

    jest.useFakeTimers().setSystemTime(new Date('2026-04-04T03:05:00.000Z'));

    await service.syncDueIntegrations();

    expect(service.syncIntegrationMock).toHaveBeenCalledTimes(1);
    expect(service.syncIntegrationMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'due' }),
    );

    jest.useRealTimers();
  });
});
