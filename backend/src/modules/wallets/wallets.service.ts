import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import type { CreateWalletDto } from './dto/create-wallet.dto';
import type { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  async create(workspaceId: string, createDto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      workspaceId,
      ...createDto,
      currency: createDto.currency || 'KZT',
      initialBalance: createDto.initialBalance || 0,
      isActive: true,
    });

    return this.walletRepository.save(wallet);
  }

  async findAll(workspaceId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id, workspaceId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async update(id: string, workspaceId: string, updateDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(id, workspaceId);
    Object.assign(wallet, updateDto);
    return this.walletRepository.save(wallet);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const wallet = await this.findOne(id, workspaceId);
    await this.walletRepository.remove(wallet);
  }
}
