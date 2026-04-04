import { BadRequestException } from '@nestjs/common';
import { decryptText } from '@/common/utils/encryption.util';
import { IntegrationProvider, type Integration } from '@/entities/integration.entity';
import type { IntegrationToken } from '@/entities/integration-token.entity';
import type { User } from '@/entities/user.entity';
import {
  OAuthIntegrationBaseService,
  type OAuthIntegrationSettingsRelationName,
  type OAuthRepositoryLike,
} from '@/common/services/oauth-integration-base.service';

function createRepoMock<T>(): OAuthRepositoryLike<T> {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    delete: jest.fn(),
  };
}

class TestOAuthIntegrationService extends OAuthIntegrationBaseService {
  protected getProvider() {
    return IntegrationProvider.DROPBOX;
  }

  protected getProviderName(): string {
    return 'Dropbox';
  }

  protected getSettingsRelationName(): OAuthIntegrationSettingsRelationName {
    return 'dropboxSettings';
  }

  protected getProviderRouteSegment(): string {
    return 'dropbox';
  }

  protected getFrontendBaseUrl(): string {
    return 'https://app.example.com';
  }

  protected getStateSecret(): string {
    return 'test-secret';
  }

  protected async refreshAccessToken() {
    return { accessToken: 'fresh-access' };
  }

  protected getAuthorizationExpiredMessage(): string {
    return 'authorization expired';
  }

  exposeBuildState(payload: Record<string, unknown>) {
    return this.buildState(payload);
  }

  exposeParseState(state: string) {
    return this.parseState(state);
  }

  exposeFindIntegrationForUser(userId: string) {
    return this.findIntegrationForUser(userId);
  }

  exposeBuildProviderAuthUrl(user: Pick<User, 'id' | 'workspaceId'>) {
    return this.buildProviderAuthUrl(user, state => `https://provider.example.com/oauth?state=${state}`);
  }

  exposeBuildIntegrationRedirect(status: string, reason?: string) {
    return this.buildIntegrationRedirect(status, reason);
  }

  exposeResolveOAuthCallbackUser(
    params: { code?: string; state?: string; error?: string },
    select: Array<keyof User>,
  ) {
    return this.resolveOAuthCallbackUser(params, select);
  }

  exposeUpsertConnectedIntegration(existing: Integration | null, user: Pick<User, 'id' | 'workspaceId'>) {
    return this.upsertConnectedIntegration(existing, user, ['scope:read']);
  }

  exposeSaveEncryptedTokenRecord(existingToken: IntegrationToken | null, integrationId: string) {
    return this.saveEncryptedTokenRecord(existingToken, integrationId, {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: new Date('2026-04-05T00:00:00.000Z'),
    });
  }
}

describe('OAuthIntegrationBaseService', () => {
  const integrationRepository = createRepoMock<Integration>();
  const integrationTokenRepository = createRepoMock<IntegrationToken>();
  const userRepository = createRepoMock<User>();

  let service: TestOAuthIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestOAuthIntegrationService(
      integrationRepository,
      integrationTokenRepository,
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

  it('finds the integration by provider and settings relation', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({ id: 'integration-1' });

    await expect(service.exposeFindIntegrationForUser('user-1')).resolves.toEqual({
      integration: { id: 'integration-1' },
      workspaceId: 'ws-1',
    });

    expect(integrationRepository.findOne).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-1', provider: IntegrationProvider.DROPBOX },
      relations: ['token', 'dropboxSettings'],
    });
  });

  it('builds provider auth urls with shared signed state payload', () => {
    const url = service.exposeBuildProviderAuthUrl({ id: 'user-1', workspaceId: 'ws-1' } as User);
    const state = new URL(url).searchParams.get('state');

    expect(service.exposeParseState(state || '')).toEqual({
      userId: 'user-1',
      workspaceId: 'ws-1',
      redirect: 'https://app.example.com/integrations/dropbox',
    });
  });

  it('builds shared redirect urls for callback errors', () => {
    expect(service.exposeBuildIntegrationRedirect('error', 'bad_state')).toBe(
      'https://app.example.com/integrations/dropbox?status=error&reason=bad_state',
    );
  });

  it('resolves callback user with shared OAuth prelude', async () => {
    const state = service.exposeBuildState({ userId: 'user-1', workspaceId: 'ws-1' });
    userRepository.findOne.mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1', timeZone: 'UTC' });

    await expect(
      service.exposeResolveOAuthCallbackUser({ code: 'code-1', state }, ['id', 'workspaceId', 'timeZone']),
    ).resolves.toEqual({
      redirectBase: 'https://app.example.com/integrations/dropbox',
      user: { id: 'user-1', workspaceId: 'ws-1', timeZone: 'UTC' },
    });
  });

  it('upserts connected integrations with provider defaults', async () => {
    integrationRepository.create = jest.fn(data => data as Integration);

    await service.exposeUpsertConnectedIntegration(null, { id: 'user-1', workspaceId: 'ws-1' } as User);

    expect(integrationRepository.create).toHaveBeenCalledWith({
      provider: IntegrationProvider.DROPBOX,
      workspaceId: 'ws-1',
      connectedByUserId: 'user-1',
      status: 'connected',
      scopes: ['scope:read'],
    });
    expect(integrationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: IntegrationProvider.DROPBOX,
        status: 'connected',
        scopes: ['scope:read'],
        connectedByUserId: 'user-1',
      }),
    );
  });

  it('persists encrypted token records through the shared helper', async () => {
    integrationTokenRepository.create = jest.fn(data => data as IntegrationToken);

    await service.exposeSaveEncryptedTokenRecord(null, 'integration-1');

    const savedToken = integrationTokenRepository.save.mock.calls[0][0] as IntegrationToken;
    expect(savedToken.integrationId).toBe('integration-1');
    expect(decryptText(savedToken.accessToken || '')).toBe('access-1');
    expect(decryptText(savedToken.refreshToken || '')).toBe('refresh-1');
    expect(savedToken.expiresAt).toEqual(new Date('2026-04-05T00:00:00.000Z'));
  });
});
