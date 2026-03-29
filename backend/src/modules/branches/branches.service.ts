import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async create(workspaceId: string, createDto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchRepository.create({
      workspaceId,
      ...createDto,
      isActive: true,
    });

    return this.branchRepository.save(branch);
  }

  async findAll(workspaceId: string): Promise<Branch[]> {
    return this.branchRepository.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id, workspaceId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, workspaceId: string, updateDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id, workspaceId);
    Object.assign(branch, updateDto);
    return this.branchRepository.save(branch);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const branch = await this.findOne(id, workspaceId);
    await this.branchRepository.remove(branch);
  }
}
