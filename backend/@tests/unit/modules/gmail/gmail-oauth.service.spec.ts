import { IntegrationProvider, IntegrationStatus, type Integration } from '@/entities/integration.entity';
import type { IntegrationToken } from '@/entities/integration-token.entity';
import type { User } from '@/entities/user.entity';
import type { GmailSettings } from '@/entities/gmail-settings.entity';
import { OAuthIntegrationBaseService } from '@/common/services/oauth-integration-base.service';
import { GmailOAuthService } from '@/modules/gmail/services/gmail-oauth.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    create: jest.fn((data: Partial<T>) => data as T),
    delete: jest.fn(),
  } as any;
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

    const url = service.getAuthUrl({ id: 'user-1', workspaceId: 'ws-1' } as User);

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

    expect(integrationTokenRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
    expect(gmailSettingsRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
    expect(integrationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'integration-1',
        status: IntegrationStatus.DISCONNECTED,
      }),
    );
  });
});
