import type { DropboxSettings } from '@/entities/dropbox-settings.entity';
import { IntegrationProvider, IntegrationStatus, type Integration } from '@/entities/integration.entity';
import type { IntegrationToken } from '@/entities/integration-token.entity';
import type { Statement } from '@/entities/statement.entity';
import type { User } from '@/entities/user.entity';
import { DropboxService } from '@/modules/dropbox/dropbox.service';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    create: jest.fn((data: Partial<T>) => data as T),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;
}

describe('DropboxService', () => {
  const integrationRepository = createRepoMock<Integration>();
  const integrationTokenRepository = createRepoMock<IntegrationToken>();
  const dropboxSettingsRepository = createRepoMock<DropboxSettings>();
  const statementRepository = createRepoMock<Statement>();
  const userRepository = createRepoMock<User>();
  const statementsService = { create: jest.fn() } as any;
  const fileStorageService = { getStatementFileStream: jest.fn() } as any;
  const auditService = { createEvent: jest.fn() } as any;

  let service: DropboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DROPBOX_CLIENT_ID = 'dropbox-client-id';
    process.env.DROPBOX_CLIENT_SECRET = 'dropbox-client-secret';

    service = new DropboxService(
      integrationRepository,
      integrationTokenRepository,
      dropboxSettingsRepository,
      statementRepository,
      userRepository,
      statementsService,
      fileStorageService,
      auditService,
    );
  });

  it('returns an error result for unsupported dropbox file types', async () => {
    userRepository.findOne
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token: { accessToken: 'enc:access', refreshToken: 'enc:refresh' },
      dropboxSettings: null,
    });

    jest.spyOn(service as any, 'getDropboxClientWithAuth').mockResolvedValue({
      filesGetMetadata: jest.fn().mockResolvedValue({
        result: {
          '.tag': 'file',
          name: 'notes.txt',
          size: 128,
        },
      }),
    });

    await expect(service.importFiles('user-1', { fileIds: ['file-1'] })).resolves.toEqual({
      ok: true,
      results: [
        {
          fileId: 'file-1',
          status: 'error',
          message: 'Unsupported file type: application/octet-stream',
        },
      ],
    });
    expect(statementsService.create).not.toHaveBeenCalled();
  });

  it('returns an error result for oversized dropbox files', async () => {
    userRepository.findOne
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token: { accessToken: 'enc:access', refreshToken: 'enc:refresh' },
      dropboxSettings: null,
    });

    jest.spyOn(service as any, 'getDropboxClientWithAuth').mockResolvedValue({
      filesGetMetadata: jest.fn().mockResolvedValue({
        result: {
          '.tag': 'file',
          name: 'statement.pdf',
          size: 11 * 1024 * 1024,
        },
      }),
    });

    await expect(service.importFiles('user-1', { fileIds: ['file-1'] })).resolves.toEqual({
      ok: true,
      results: [
        {
          fileId: 'file-1',
          status: 'error',
          message: 'File size exceeds limit',
        },
      ],
    });
    expect(statementsService.create).not.toHaveBeenCalled();
  });

  it('imports a supported dropbox file successfully', async () => {
    userRepository.findOne
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({ id: 'user-1', workspaceId: 'ws-1' });
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      provider: IntegrationProvider.DROPBOX,
      status: IntegrationStatus.CONNECTED,
      token: { accessToken: 'enc:access', refreshToken: 'enc:refresh' },
      dropboxSettings: null,
    });

    const filesGetMetadata = jest.fn().mockResolvedValue({
      result: {
        '.tag': 'file',
        name: 'statement.pdf',
        size: 128,
      },
    });
    const filesDownload = jest.fn().mockResolvedValue({
      result: {
        fileBinary: Buffer.from('pdf-data'),
      },
    });
    jest.spyOn(service as any, 'getDropboxClientWithAuth').mockResolvedValue({
      filesGetMetadata,
      filesDownload,
    });

    await expect(service.importFiles('user-1', { fileIds: ['file-1'] })).resolves.toEqual({
      ok: true,
      results: [{ fileId: 'file-1', status: 'ok' }],
    });
    expect(filesDownload).toHaveBeenCalledWith({ path: 'file-1' });
    expect(statementsService.create).toHaveBeenCalledTimes(1);
    expect(statementsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', workspaceId: 'ws-1' }),
      'ws-1',
      expect.objectContaining({
        originalname: 'statement.pdf',
        mimetype: 'application/pdf',
      }),
      undefined,
      undefined,
      undefined,
      false,
    );
  });
});
