import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import type { Repository } from 'typeorm';
import { decryptText, encryptText } from '../../common/utils/encryption.util';
import { User, WorkspaceServiceSettings, WorkspaceServiceSettingsKey } from '../../entities';

export type AiRuntimeSettings = {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type SmtpRuntimeSettings = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string | null;
  replyTo: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type TelegramRuntimeSettings = {
  botToken: string | null;
  timeoutMs: number;
  source: 'workspace' | 'env' | 'disabled';
};

export type AppRuntimeSettings = {
  publicUrl: string | null;
  source: 'workspace' | 'env' | 'disabled';
};

@Injectable()
export class ApplicationSettingsService {
  constructor(
    @InjectRepository(WorkspaceServiceSettings)
    private readonly settingsRepository: Repository<WorkspaceServiceSettings>,
  ) {}

  async getAiStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.AI);
    const runtime = await this.getAiSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        enabled: runtime.enabled,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        timeoutMs: runtime.timeoutMs,
        apiKeyConfigured: Boolean(settings?.encryptedSecrets?.apiKey || process.env.AI_API_KEY),
      },
    };
  }

  async saveAiSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.AI);
    const config = {
      enabled: this.booleanValue(input.enabled, true),
      baseUrl: this.requiredString(input.baseUrl, 'baseUrl').replace(/\/+$/, ''),
      model: this.requiredString(input.model, 'model'),
      timeoutMs: this.positiveNumber(input.timeoutMs, 20000),
    };
    const secrets = this.mergeSecrets(existing, ['apiKey'], input);
    const runtime = this.aiRuntimeFromParts(config, secrets, 'workspace');
    await this.assertAiConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.AI, config, secrets);
    return this.getAiStatus(user);
  }

  async getSmtpStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP);
    const runtime = await this.getSmtpSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        host: runtime.host,
        port: runtime.port,
        secure: runtime.secure,
        user: runtime.user,
        from: runtime.from,
        replyTo: runtime.replyTo,
        timeoutMs: runtime.timeoutMs,
        passConfigured: Boolean(settings?.encryptedSecrets?.pass || process.env.SMTP_PASS),
      },
    };
  }

  async saveSmtpSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP);
    const config = {
      host: this.requiredString(input.host, 'host'),
      port: this.positiveNumber(input.port, 587),
      secure: this.booleanValue(input.secure, false),
      user: this.stringValue(input.user),
      from: this.requiredString(input.from, 'from'),
      replyTo: this.stringValue(input.replyTo),
      timeoutMs: this.positiveNumber(input.timeoutMs, 10000),
    };
    const secrets = this.mergeSecrets(existing, ['pass'], input);
    const runtime = this.smtpRuntimeFromParts(config, secrets, 'workspace');
    await this.assertSmtpConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.SMTP, config, secrets);
    return this.getSmtpStatus(user);
  }

  async getTelegramStatus(user: User) {
    const settings = await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM);
    const runtime = await this.getTelegramSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        timeoutMs: runtime.timeoutMs,
        botTokenConfigured: Boolean(
          settings?.encryptedSecrets?.botToken || process.env.TELEGRAM_BOT_TOKEN,
        ),
      },
    };
  }

  async saveTelegramSettings(user: User, input: Record<string, unknown>) {
    const existing = await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM);
    const config = {
      timeoutMs: this.positiveNumber(input.timeoutMs, 10000),
    };
    const secrets = this.mergeSecrets(existing, ['botToken'], input);
    const runtime = this.telegramRuntimeFromParts(config, secrets, 'workspace');
    await this.assertTelegramConnection(runtime);
    await this.saveSettings(user, WorkspaceServiceSettingsKey.TELEGRAM, config, secrets);
    return this.getTelegramStatus(user);
  }

  async getAppStatus(user: User) {
    const runtime = await this.getAppSettings(user);
    return {
      connected: runtime.source !== 'disabled',
      status: runtime.source !== 'disabled' ? 'connected' : 'disconnected',
      source: runtime.source,
      settings: {
        publicUrl: runtime.publicUrl,
      },
    };
  }

  async saveAppSettings(user: User, input: Record<string, unknown>) {
    const publicUrl = this.normalizeOrigin(this.requiredString(input.publicUrl, 'publicUrl'));
    await this.saveSettings(user, WorkspaceServiceSettingsKey.APP, { publicUrl }, {});
    return this.getAppStatus(user);
  }

  async disconnect(user: User, key: WorkspaceServiceSettingsKey) {
    const workspaceId = this.requireWorkspaceId(user);
    await this.settingsRepository.delete({ workspaceId, key });
    return { ok: true };
  }

  async getAiSettings(user?: User | null): Promise<AiRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.AI) : null;
    if (workspace) {
      return this.aiRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      enabled: true,
      baseUrl: process.env.AI_BASE_URL?.replace(/\/+$/, '') || null,
      apiKey: process.env.AI_API_KEY || null,
      model: process.env.AI_MODEL || null,
      timeoutMs: this.positiveNumber(process.env.AI_TIMEOUT_MS, 20000),
    };
    return env.baseUrl && env.model ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getAiSettingsForWorkspaceId(workspaceId?: string | null): Promise<AiRuntimeSettings> {
    if (workspaceId) {
      const workspace = await this.settingsRepository.findOne({
        where: { workspaceId, key: WorkspaceServiceSettingsKey.AI },
      });
      if (workspace) {
        return this.aiRuntimeFromParts(
          workspace.config,
          this.decryptSecrets(workspace.encryptedSecrets),
          'workspace',
        );
      }
    }
    return this.getAiSettings(null);
  }

  async getSmtpSettings(user?: User | null): Promise<SmtpRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.SMTP) : null;
    if (workspace) {
      return this.smtpRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      host: process.env.SMTP_HOST || null,
      port: this.positiveNumber(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null,
      from: process.env.SMTP_FROM || null,
      replyTo: process.env.SMTP_REPLY_TO || null,
      timeoutMs: this.positiveNumber(process.env.SMTP_TIMEOUT_MS, 10000),
    };
    return env.host && env.from ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getTelegramSettings(user?: User | null): Promise<TelegramRuntimeSettings> {
    const workspace = user
      ? await this.findSettings(user, WorkspaceServiceSettingsKey.TELEGRAM)
      : null;
    if (workspace) {
      return this.telegramRuntimeFromParts(
        workspace.config,
        this.decryptSecrets(workspace.encryptedSecrets),
        'workspace',
      );
    }

    const env = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || null,
      timeoutMs: this.positiveNumber(process.env.TELEGRAM_TIMEOUT_MS, 10000),
    };
    return env.botToken ? { ...env, source: 'env' } : { ...env, source: 'disabled' };
  }

  async getAppSettings(user?: User | null): Promise<AppRuntimeSettings> {
    const workspace = user ? await this.findSettings(user, WorkspaceServiceSettingsKey.APP) : null;
    if (workspace) {
      const publicUrl = this.stringValue(workspace.config.publicUrl);
      return publicUrl
        ? { publicUrl, source: 'workspace' }
        : { publicUrl: null, source: 'disabled' };
    }

    const publicUrl = this.normalizeOrigin(process.env.APP_URL || process.env.FRONTEND_URL || '');
    return publicUrl ? { publicUrl, source: 'env' } : { publicUrl: null, source: 'disabled' };
  }

  private async findSettings(user: User, key: WorkspaceServiceSettingsKey) {
    const workspaceId = this.requireWorkspaceId(user);
    return this.settingsRepository.findOne({ where: { workspaceId, key } });
  }

  private async saveSettings(
    user: User,
    key: WorkspaceServiceSettingsKey,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ) {
    const workspaceId = this.requireWorkspaceId(user);
    const existing = await this.settingsRepository.findOne({ where: { workspaceId, key } });
    const entity =
      existing ||
      this.settingsRepository.create({
        workspaceId,
        key,
      });
    entity.config = config;
    entity.encryptedSecrets = Object.fromEntries(
      Object.entries(secrets)
        .filter(([, value]) => value)
        .map(([secretKey, value]) => [secretKey, encryptText(value)]),
    );
    entity.updatedByUserId = user.id;
    await this.settingsRepository.save(entity);
  }

  private mergeSecrets(
    existing: WorkspaceServiceSettings | null,
    keys: string[],
    input: Record<string, unknown>,
  ): Record<string, string> {
    const previous = this.decryptSecrets(existing?.encryptedSecrets || {});
    const next: Record<string, string> = {};
    for (const key of keys) {
      const incoming = this.stringValue(input[key]);
      next[key] = incoming === undefined || incoming === '' ? previous[key] || '' : incoming;
    }
    return next;
  }

  private decryptSecrets(encryptedSecrets: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(encryptedSecrets || {}).map(([key, value]) => [key, decryptText(value)]),
    );
  }

  private aiRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: AiRuntimeSettings['source'],
  ): AiRuntimeSettings {
    const baseUrl = this.stringValue(config.baseUrl)?.replace(/\/+$/, '') || null;
    const model = this.stringValue(config.model) || null;
    return {
      enabled: this.booleanValue(config.enabled, true),
      baseUrl,
      apiKey: secrets.apiKey || null,
      model,
      timeoutMs: this.positiveNumber(config.timeoutMs, 20000),
      source: baseUrl && model ? source : 'disabled',
    };
  }

  private smtpRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: SmtpRuntimeSettings['source'],
  ): SmtpRuntimeSettings {
    const host = this.stringValue(config.host) || null;
    const from = this.stringValue(config.from) || null;
    return {
      host,
      port: this.positiveNumber(config.port, 587),
      secure: this.booleanValue(config.secure, false),
      user: this.stringValue(config.user) || null,
      pass: secrets.pass || null,
      from,
      replyTo: this.stringValue(config.replyTo) || null,
      timeoutMs: this.positiveNumber(config.timeoutMs, 10000),
      source: host && from ? source : 'disabled',
    };
  }

  private telegramRuntimeFromParts(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    source: TelegramRuntimeSettings['source'],
  ): TelegramRuntimeSettings {
    const botToken = secrets.botToken || null;
    return {
      botToken,
      timeoutMs: this.positiveNumber(config.timeoutMs, 10000),
      source: botToken ? source : 'disabled',
    };
  }

  private async assertAiConnection(settings: AiRuntimeSettings) {
    if (!(settings.baseUrl && settings.model)) {
      throw new BadRequestException('AI baseUrl and model are required');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: 'Return {"ok":true} as JSON.' }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadRequestException(`AI endpoint returned ${response.status}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to connect to AI endpoint');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async assertSmtpConnection(settings: SmtpRuntimeSettings) {
    if (!(settings.host && settings.from)) {
      throw new BadRequestException('SMTP host and from are required');
    }
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth:
        settings.user && settings.pass
          ? {
              user: settings.user,
              pass: settings.pass,
            }
          : undefined,
      connectionTimeout: settings.timeoutMs,
      greetingTimeout: settings.timeoutMs,
      socketTimeout: settings.timeoutMs,
    });
    try {
      await transporter.verify();
    } catch {
      throw new BadRequestException('Unable to verify SMTP connection');
    }
  }

  private async assertTelegramConnection(settings: TelegramRuntimeSettings) {
    if (!settings.botToken) {
      throw new BadRequestException('Telegram botToken is required');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as { ok?: boolean; description?: string };
      if (!(response.ok && payload.ok)) {
        throw new BadRequestException(payload.description || 'Telegram bot token is invalid');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to connect to Telegram');
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireWorkspaceId(user: User): string {
    const workspaceId = user.workspaceId || user.lastWorkspaceId;
    if (!workspaceId) {
      throw new BadRequestException('Workspace is required');
    }
    return workspaceId;
  }

  private requiredString(value: unknown, name: string): string {
    const text = this.stringValue(value);
    if (!text) {
      throw new BadRequestException(`${name} is required`);
    }
    return text;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim() || undefined : undefined;
  }

  private booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private positiveNumber(value: unknown, fallback: number): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private normalizeOrigin(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
      return new URL(hasScheme ? trimmed : `https://${trimmed}`).origin;
    } catch {
      throw new BadRequestException('publicUrl must be a valid URL');
    }
  }
}
