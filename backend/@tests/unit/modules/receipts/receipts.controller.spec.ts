import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../../../src/common/guards/workspace-context.guard';
import { ReceiptsController } from '../../../../src/modules/receipts/receipts.controller';
import { ReceiptsService } from '../../../../src/modules/receipts/receipts.service';

describe('ReceiptsController', () => {
  let controller: ReceiptsController;
  let service: {
    createFromUpload: jest.Mock;
    createFromScan: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    bulkApprove: jest.Mock;
    delete: jest.Mock;
    getFilePayload: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createFromUpload: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
      createFromScan: jest.fn().mockResolvedValue({ id: 'receipt-2' }),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      findOne: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
      update: jest.fn().mockResolvedValue({ id: 'receipt-1', status: 'draft' }),
      approve: jest.fn().mockResolvedValue({
        receipt: { id: 'receipt-1', status: 'approved' },
        transaction: { id: 'tx-1' },
      }),
      bulkApprove: jest.fn().mockResolvedValue({ approved: 2, failed: 0, errors: [] }),
      delete: jest.fn().mockResolvedValue({ success: true }),
      getFilePayload: jest.fn().mockResolvedValue({
        buffer: Buffer.from('file-data'),
        fileName: 'receipt.jpg',
        mimeType: 'image/jpeg',
      }),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [{ provide: ReceiptsService, useValue: service }],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue({ canActivate: jest.fn().mockReturnValue(true) });
    moduleBuilder
      .overrideGuard(WorkspaceContextGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });
    moduleBuilder
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(ReceiptsController);
  });

  it('delegates upload to service', async () => {
    const user = { id: 'user-1' } as any;
    await controller.upload(
      [
        {
          originalname: 'receipt.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          filename: 'receipt.jpg',
          path: '/tmp/receipt.jpg',
        } as Express.Multer.File,
      ],
      { language: 'eng' } as any,
      user,
      'workspace-1',
    );

    expect(service.createFromUpload).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', workspaceId: 'workspace-1', language: 'eng' }),
    );
  });

  it('delegates scan upload to service', async () => {
    const user = { id: 'user-1' } as any;
    await controller.scan(
      {
        originalname: 'scan.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        filename: 'scan.jpg',
        path: '/tmp/scan.jpg',
      } as Express.Multer.File,
      { language: 'auto' } as any,
      user,
      'workspace-1',
    );

    expect(service.createFromScan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', workspaceId: 'workspace-1', language: 'auto' }),
    );
  });

  it('delegates approval to service', async () => {
    await controller.approve('receipt-1', 'workspace-1');

    expect(service.approve).toHaveBeenCalledWith('receipt-1', 'workspace-1');
  });

  it('delegates bulk approval to service', async () => {
    await controller.bulkApprove({ receiptIds: ['receipt-1', 'receipt-2'] } as any, 'workspace-1');

    expect(service.bulkApprove).toHaveBeenCalledWith(
      ['receipt-1', 'receipt-2'],
      'workspace-1',
      undefined,
    );
  });

  it('delegates delete to service', async () => {
    await controller.delete('receipt-1', 'workspace-1');

    expect(service.delete).toHaveBeenCalledWith('receipt-1', 'workspace-1');
  });

  it('returns receipt file content', async () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await controller.getFile('receipt-1', 'workspace-1', response);

    expect(service.getFilePayload).toHaveBeenCalledWith('receipt-1', 'workspace-1');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(response.send).toHaveBeenCalledWith(Buffer.from('file-data'));
  });

  it('returns 404 when receipt file is missing', async () => {
    service.getFilePayload.mockResolvedValue(null);

    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    } as any;

    await controller.getFile('receipt-1', 'workspace-1', response);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
