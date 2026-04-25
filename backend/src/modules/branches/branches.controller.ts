import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @WorkspaceAuth(Permission.BRANCH_CREATE)
  async create(
    @Body() createDto: CreateBranchDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.branchesService.create(workspaceId, createDto);
  }

  @Get()
  @WorkspaceAuth(Permission.BRANCH_VIEW)
  async findAll(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.branchesService.findAll(workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.BRANCH_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.branchesService.findOne(id, workspaceId);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.BRANCH_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBranchDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.branchesService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.BRANCH_DELETE)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.branchesService.remove(id, workspaceId);
    return { message: 'Branch deleted successfully' };
  }
}
