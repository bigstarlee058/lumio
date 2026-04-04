import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import type { Repository } from 'typeorm';
import { decryptText, encryptText } from '../../../common/utils/encryption.util';
import {
  OAuthIntegrationBaseService,
  type OAuthIntegrationSettingsRelationName,
} from '../../../common/services/oauth-integration-base.service';
import {
  GmailSettings,
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationToken,
  User,
} from '../../../entities';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/spreadsheets',
];

@Injectable()
export class GmailOAuthService extends OAuthIntegrationBaseService {
  protected readonly logger = new Logger(GmailOAuthService.name);

  constructor(
    @InjectRepository(Integration)
    integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationToken)
    integrationTokenRepository: Repository<IntegrationToken>,
    @InjectRepository(GmailSettings)
    private readonly gmailSettingsRepository: Repository<GmailSettings>,
    @InjectRepository(User)
    userRepository: Repository<User>,
  ) {
    super(integrationRepository, integrationTokenRepository, userRepository);
  }

  protected getProvider(): IntegrationProvider {
    return IntegrationProvider.GMAIL;
  }

  protected getProviderName(): string {
    return 'Gmail';
  }

  protected getProviderRouteSegment(): string {
    return 'gmail';
  }

  protected getSettingsRelationName(): OAuthIntegrationSettingsRelationName {
    return 'gmailSettings';
  }

  private getClientId() {
    return process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  }

  private getClientSecret() {
    return process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private getRedirectUri() {
    return process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '';
  }

  protected getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  }

  protected getStateSecret() {
    return process.env.GMAIL_STATE_SECRET || process.env.JWT_SECRET || 'lumio-state';
  }

  private getOAuthClient() {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Gmail OAuth is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  override async findIntegrationForUser(userId: string) {
    return super.findIntegrationForUser(userId);
  }

  override async ensureIntegration(userId: string) {
    return super.ensureIntegration(userId);
  }

  getAuthUrl(user: User): string {
    const client = this.getOAuthClient();
    const state = this.buildState({
      userId: user.id,
      workspaceId: user.workspaceId || null,
      redirect: `${this.getFrontendBaseUrl()}/integrations/gmail`,
    });

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      state,
    });
  }

  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ redirectUrl: string; integration?: Integration }> {
    const redirectBase = `${this.getFrontendBaseUrl()}/integrations/gmail`;

    if (params.error) {
      return {
        redirectUrl: `${redirectBase}?status=error&reason=${encodeURIComponent(params.error)}`,
      };
    }

    if (!params.code || !params.state) {
      return { redirectUrl: `${redirectBase}?status=error&reason=missing_code` };
    }

    let state: Record<string, unknown>;
    try {
      state = this.parseState(params.state);
    } catch (error) {
      return { redirectUrl: `${redirectBase}?status=error&reason=bad_state` };
    }

    const userId = typeof state.userId === 'string' ? state.userId : null;
    if (!userId) {
      return { redirectUrl: `${redirectBase}?status=error&reason=missing_user` };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });

    if (!user) {
      return { redirectUrl: `${redirectBase}?status=error&reason=user_not_found` };
    }

    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(params.code);
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';

    if (!accessToken && !refreshToken) {
      return { redirectUrl: `${redirectBase}?status=error&reason=missing_tokens` };
    }

    const workspaceId = user.workspaceId || null;
    const existing = await this.integrationRepository.findOne({
      where: workspaceId
        ? { workspaceId, provider: IntegrationProvider.GMAIL }
        : {
            connectedByUserId: user.id,
            provider: IntegrationProvider.GMAIL,
          },
      relations: ['token', 'gmailSettings'],
    });

    const integration =
      existing ||
      this.integrationRepository.create({
        provider: IntegrationProvider.GMAIL,
        workspaceId,
        connectedByUserId: user.id,
      });

    integration.status = IntegrationStatus.CONNECTED;
    integration.scopes = tokens.scope
      ? tokens.scope.split(' ')
      : integration.scopes || GMAIL_SCOPES;
    integration.connectedByUserId = user.id;

    const savedIntegration = await this.integrationRepository.save(integration);

    const tokenRecord =
      existing?.token ||
      this.integrationTokenRepository.create({
        integrationId: savedIntegration.id,
      });

    if (accessToken) {
      tokenRecord.encryptedAccessToken = encryptText(accessToken);
      tokenRecord.accessToken = accessToken;
    }
    if (refreshToken) {
      tokenRecord.encryptedRefreshToken = encryptText(refreshToken);
      tokenRecord.refreshToken = refreshToken;
    }
    if (tokens.expiry_date) {
      tokenRecord.expiresAt = new Date(tokens.expiry_date);
    }

    await this.integrationTokenRepository.save(tokenRecord);

    // Create or update Gmail settings
    const settings =
      existing?.gmailSettings ||
      this.gmailSettingsRepository.create({
        integrationId: savedIntegration.id,
        labelName: 'Lumio/Receipts',
        filterEnabled: true,
        filterConfig: {
          hasAttachment: true,
          keywords: ['receipt', 'invoice', 'order confirmation'],
        },
      });

    await this.gmailSettingsRepository.save(settings);

    return {
      redirectUrl: `${redirectBase}?status=success`,
      integration: savedIntegration,
    };
  }

  protected async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const client = this.getOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await client.refreshAccessToken();

    return {
      accessToken: credentials.access_token || '',
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    };
  }

  protected getAuthorizationExpiredMessage(): string {
    return 'Failed to refresh access token';
  }

  private async refreshAccessTokenForIntegration(integration: Integration): Promise<string> {
    const tokenRecord = await this.integrationTokenRepository.findOne({
      where: { integrationId: integration.id },
    });

    if (!tokenRecord?.encryptedRefreshToken && !tokenRecord?.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    let refreshToken: string;
    if (tokenRecord.encryptedRefreshToken) {
      refreshToken = decryptText(tokenRecord.encryptedRefreshToken);
    } else if (tokenRecord.refreshToken) {
      refreshToken = tokenRecord.refreshToken;
      tokenRecord.encryptedRefreshToken = encryptText(refreshToken);
    } else {
      throw new BadRequestException('No refresh token available');
    }

    try {
      const refreshed = await this.refreshAccessToken(refreshToken);

      if (refreshed.accessToken) {
        tokenRecord.encryptedAccessToken = encryptText(refreshed.accessToken);
        tokenRecord.accessToken = refreshed.accessToken;
      }
      if (refreshed.expiresAt) {
        tokenRecord.expiresAt = refreshed.expiresAt;
      }

      await this.integrationTokenRepository.save(tokenRecord);

      if (integration.status !== IntegrationStatus.CONNECTED) {
        integration.status = IntegrationStatus.CONNECTED;
        await this.integrationRepository.save(integration);
      }

      return refreshed.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh Gmail access token', error);
      integration.status = IntegrationStatus.NEEDS_REAUTH;
      await this.integrationRepository.save(integration);
      throw new BadRequestException('Failed to refresh access token');
    }
  }

  async getGmailClient(userId: string) {
    const integration = await this.ensureIntegration(userId);

    // If the integration is already marked as needing re-auth, fail fast
    if (integration.status === IntegrationStatus.NEEDS_REAUTH) {
      throw new BadRequestException('Integration needs re-authentication');
    }

    // Ensure required scopes (including Sheets) are present. If not, mark integration as NEEDS_REAUTH
    const requiredScope = 'https://www.googleapis.com/auth/spreadsheets';
    const currentScopesRaw = integration.scopes || [];
    const currentScopes = Array.isArray(currentScopesRaw)
      ? currentScopesRaw
      : String(currentScopesRaw).split(' ').filter(Boolean);

    if (!currentScopes.includes(requiredScope)) {
      integration.status = IntegrationStatus.NEEDS_REAUTH;
      await this.integrationRepository.save(integration);
      throw new BadRequestException(
        'Gmail integration requires re-authentication to grant Google Sheets access',
      );
    }

    const tokenRecord = await this.integrationTokenRepository.findOne({
      where: { integrationId: integration.id },
    });

    // Fallback to plain accessToken if encrypted version doesn't exist
    if (!tokenRecord?.encryptedAccessToken && !tokenRecord?.accessToken) {
      throw new BadRequestException('No access token available');
    }

    let accessToken: string;
    if (tokenRecord.encryptedAccessToken) {
      accessToken = decryptText(tokenRecord.encryptedAccessToken);
    } else if (tokenRecord.accessToken) {
      // Migrate plain token to encrypted
      accessToken = tokenRecord.accessToken;
      tokenRecord.encryptedAccessToken = encryptText(accessToken);
      await this.integrationTokenRepository.save(tokenRecord);
    } else {
      throw new BadRequestException('No access token available');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt && new Date() >= tokenRecord.expiresAt) {
      accessToken = await this.refreshAccessTokenForIntegration(integration);
    }

    const client = this.getOAuthClient();
    client.setCredentials({ access_token: accessToken });

    return { client, integration };
  }

  async disconnect(userId: string): Promise<void> {
    const integration = await this.ensureIntegration(userId);

    // Delete token
    await this.integrationTokenRepository.delete({ integrationId: integration.id });

    // Delete settings
    await this.gmailSettingsRepository.delete({ integrationId: integration.id });

    // Update integration status
    integration.status = IntegrationStatus.DISCONNECTED;
    await this.integrationRepository.save(integration);
  }
}
