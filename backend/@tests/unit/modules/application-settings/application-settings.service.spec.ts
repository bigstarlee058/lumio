jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

import { ApplicationSettingsService } from '../../../../src/modules/application-settings/application-settings.service';
import { WorkspaceServiceSettingsKey } from '../../../../src/entities';

describe('ApplicationSettingsService', () => {
  const originalEnv = process.env;
  const user = { id: 'user-1', workspaceId: 'workspace-1' } as never;
  const saved: Record<string, unknown> = {};
  const repository = {
    findOne: jest.fn(),
    create: jest.fn(input => input),
    save: jest.fn(async entity => {
      saved[String(entity.key)] = entity;
      return entity;
    }),
    delete: jest.fn(),
  };

  const createService = () => new ApplicationSettingsService(repository as never);

  beforeEach(() => {
    process.env = { ...originalEnv };
    repository.findOne.mockImplementation(({ where }: { where?: { key?: string } } = {}) =>
      Promise.resolve(where?.key ? saved[where.key] || null : null),
    );
    repository.create.mockImplementation(input => input);
    repository.save.mockClear();
    repository.delete.mockClear();
    Object.keys(saved).forEach(key => delete saved[key]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    }) as never;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('saves AI settings without returning the API key', async () => {
    const result = await createService().saveAiSettings(user, {
      baseUrl: 'http://localhost:11434/',
      model: 'llama3.1',
      apiKey: 'secret-key',
      timeoutMs: 15000,
    });

    expect(result.connected).toBe(true);
    expect(result.settings).toMatchObject({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
      apiKeyConfigured: true,
    });
    expect(result.settings).not.toHaveProperty('apiKey');
    expect(saved[WorkspaceServiceSettingsKey.AI]).toMatchObject({
      workspaceId: 'workspace-1',
      key: WorkspaceServiceSettingsKey.AI,
    });
  });

  it('preserves an existing SMTP password when the password field is blank', async () => {
    await createService().saveSmtpSettings(user, {
      host: 'mail.example.com',
      port: 587,
      user: 'lumio@example.com',
      pass: 'initial-secret',
      from: 'Lumio <noreply@example.com>',
    });

    const result = await createService().saveSmtpSettings(user, {
      host: 'mail.example.com',
      port: 587,
      user: 'lumio@example.com',
      pass: '',
      from: 'Lumio <noreply@example.com>',
    });

    expect(result.settings.passConfigured).toBe(true);
    expect(result.settings).not.toHaveProperty('pass');
  });

  it('deletes workspace settings on disconnect', async () => {
    await createService().disconnect(user, WorkspaceServiceSettingsKey.TELEGRAM);

    expect(repository.delete).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      key: WorkspaceServiceSettingsKey.TELEGRAM,
    });
  });
});
