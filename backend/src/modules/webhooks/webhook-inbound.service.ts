import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { WebhookEndpoint } from '../../entities/webhook-endpoint.entity';
import { WorkspaceMember, WorkspaceRole } from '../../entities/workspace-member.entity';
import { User } from '../../entities/user.entity';
import { StatementsService } from '../statements/statements.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import type { WebhookStatementUploadDto } from './dto/webhook-statement-upload.dto';
import type { WebhookReceiptUploadDto } from './dto/webhook-receipt-upload.dto';

@Injectable()
export class WebhookInboundService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly statementsService: StatementsService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  private async resolveWorkspaceOwner(workspaceId: string): Promise<User> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, role: WorkspaceRole.OWNER },
      relations: ['user'],
    });
    if (!member?.user) throw new NotFoundException('Workspace owner not found');
    return member.user;
  }

  private async base64ToFile(base64: string, fileName: string): Promise<Express.Multer.File> {
    const buffer = Buffer.from(base64, 'base64');
    const uniqueName = `${randomUUID()}${extname(fileName || '.bin')}`;
    const uploadsDir = resolveUploadsDir();
    const filePath = join(uploadsDir, uniqueName);
    await writeFile(filePath, buffer);
    return {
      fieldname: 'file',
      originalname: fileName || uniqueName,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      destination: uploadsDir,
      filename: uniqueName,
      path: filePath,
      size: buffer.length,
      stream: null as any,
      buffer: null as any,
    };
  }

  async uploadStatement(
    endpoint: WebhookEndpoint,
    file: Express.Multer.File | null,
    dto: WebhookStatementUploadDto,
  ) {
    const user = await this.resolveWorkspaceOwner(endpoint.workspaceId);
    const resolvedFile =
      file ?? (dto.fileBase64 ? await this.base64ToFile(dto.fileBase64, dto.fileName ?? 'statement.pdf') : null);
    if (!resolvedFile) throw new NotFoundException('No file provided');
    const walletId = dto.walletId ?? endpoint.defaultWalletId ?? undefined;
    const branchId = dto.branchId ?? endpoint.defaultBranchId ?? undefined;
    return this.statementsService.create(
      user,
      endpoint.workspaceId,
      resolvedFile,
      undefined,
      walletId,
      branchId,
      true,
    );
  }

  async uploadReceipt(
    endpoint: WebhookEndpoint,
    file: Express.Multer.File | null,
    dto: WebhookReceiptUploadDto,
  ) {
    const user = await this.resolveWorkspaceOwner(endpoint.workspaceId);
    const resolvedFile =
      file ?? (dto.fileBase64 ? await this.base64ToFile(dto.fileBase64, dto.fileName ?? 'receipt.jpg') : null);
    if (!resolvedFile) throw new NotFoundException('No file provided');
    return this.receiptsService.createFromUpload({
      userId: user.id,
      workspaceId: endpoint.workspaceId,
      files: [resolvedFile],
      language: dto.language,
    });
  }
}
