import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.WALLET_CREATE)
  async create(
    @Body() createDto: CreateWalletDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.walletsService.create(workspaceId, createDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.WALLET_VIEW)
  async findAll(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.walletsService.findAll(workspaceId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.WALLET_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.walletsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.WALLET_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWalletDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.walletsService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.WALLET_DELETE)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.walletsService.remove(id, workspaceId);
    return { message: 'Wallet deleted successfully' };
  }
}
