import { OAuthIntegrationBaseService } from '@/common/services/oauth-integration-base.service';
import type { GmailSettings } from '@/entities/gmail-settings.entity';
import type { IntegrationToken } from '@/entities/integration-token.entity';
import {
  type Integration,
  IntegrationProvider,
  IntegrationStatus,
} from '@/entities/integration.entity';
import type { User } from '@/entities/user.entity';
import { GmailOAuthService } from '@/modules/gmail/services/gmail-oauth.service';
import { decryptText } from '@/common/utils/encryption.util';

type RepoMock<T> = {
  findOne: jest.Mock<Promise<T | null>, [unknown]>;
  save: jest.Mock<Promise<T>, [Partial<T>]>;
  create: jest.Mock<T, [Partial<T>]>;
  delete: jest.Mock<Promise<unknown>, [unknown]>;
};

function createRepoMock<T>(): RepoMock<T> {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    create: jest.fn((data: Partial<T>) => data as T),
    delete: jest.fn(),
  };
}

describe('GmailOAuthService', () => {
  const integrationRepository = createRepoMock<Integration>();
  const integrationTokenRepository = createRepoMock<IntegrationToken>();
  const gmailSettingsRepository = createRepoMock<GmailSettings>();
  const userRepository = createRepoMock<User>();

  let service: GmailOAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_CLIENT_ID = 'gmail-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'gmail-client-secret';
    process.env.GMAIL_REDIRECT_URI = 'https://app.example.com/api/gmail/callback';
    process.env.FRONTEND_URL = 'https://app.example.com';

    service = new GmailOAuthService(
      integrationRepository,
      integrationTokenRepository,
      gmailSettingsRepository,
      userRepository,
    );
  });

  it('reuses signed state helpers when building the auth url', () => {
    expect(service).toBeInstanceOf(OAuthIntegrationBaseService);

    const url = service.getAuthUrl({ id: 'user-1', workspaceId: 'ws-1' } as unknown as User);

    expect(url).toContain('state=');
    expect(url).toContain('access_type=offline');
  });

  it('disconnects gmail integration and clears token plus settings', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.GMAIL,
      status: IntegrationStatus.CONNECTED,
      token: { integrationId: 'integration-1' },
      gmailSettings: { integrationId: 'integration-1' },
    });

    await service.disconnect('user-1');

    expect(integrationTokenRepository.delete).toHaveBeenCalledWith({
      integrationId: 'integration-1',
    });
    expect(gmailSettingsRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
    expect(integrationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'integration-1',
        status: IntegrationStatus.DISCONNECTED,
      }),
    );
  });

  it('stores Gmail callback tokens only in encrypted fields', async () => {
    const state = (service as any).buildState({ userId: 'user-1' });
    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue(null);
    integrationRepository.create.mockReturnValue({
      id: 'integration-1',
      provider: IntegrationProvider.GMAIL,
      status: IntegrationStatus.DISCONNECTED,
    } as Integration);
    integrationRepository.save.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.GMAIL,
      status: IntegrationStatus.CONNECTED,
    } as Integration);
    (service as any).requestToken = jest.fn(async () => ({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 3600,
    }));

    await service.handleCallback({ code: 'code-1', state });

    const savedToken = integrationTokenRepository.save.mock.calls[0][0];
    expect(savedToken.accessToken).toBeNull();
    expect(savedToken.refreshToken).toBeNull();
    expect(savedToken.encryptedAccessToken).toMatch(/^enc:/);
    expect(savedToken.encryptedRefreshToken).toMatch(/^enc:/);
    expect(decryptText(savedToken.encryptedAccessToken!)).toBe('access-1');
    expect(decryptText(savedToken.encryptedRefreshToken!)).toBe('refresh-1');
  });
});
