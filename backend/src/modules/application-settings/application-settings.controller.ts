import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, WorkspaceServiceSettingsKey } from '../../entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplicationSettingsService } from './application-settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class ApplicationSettingsController {
  constructor(private readonly applicationSettingsService: ApplicationSettingsService) {}

  @Get('integrations/ai')
  getAi(@CurrentUser() user: User) {
    return this.applicationSettingsService.getAiStatus(user);
  }

  @Put('integrations/ai')
  saveAi(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.applicationSettingsService.saveAiSettings(user, body);
  }

  @Delete('integrations/ai')
  disconnectAi(@CurrentUser() user: User) {
    return this.applicationSettingsService.disconnect(user, WorkspaceServiceSettingsKey.AI);
  }

  @Get('email/smtp')
  getSmtp(@CurrentUser() user: User) {
    return this.applicationSettingsService.getSmtpStatus(user);
  }

  @Put('email/smtp')
  saveSmtp(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.applicationSettingsService.saveSmtpSettings(user, body);
  }

  @Delete('email/smtp')
  disconnectSmtp(@CurrentUser() user: User) {
    return this.applicationSettingsService.disconnect(user, WorkspaceServiceSettingsKey.SMTP);
  }

  @Get('notifications/telegram')
  getTelegram(@CurrentUser() user: User) {
    return this.applicationSettingsService.getTelegramStatus(user);
  }

  @Put('notifications/telegram')
  saveTelegram(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.applicationSettingsService.saveTelegramSettings(user, body);
  }

  @Delete('notifications/telegram')
  disconnectTelegram(@CurrentUser() user: User) {
    return this.applicationSettingsService.disconnect(user, WorkspaceServiceSettingsKey.TELEGRAM);
  }

  @Get('app')
  getApp(@CurrentUser() user: User) {
    return this.applicationSettingsService.getAppStatus(user);
  }

  @Put('app')
  saveApp(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.applicationSettingsService.saveAppSettings(user, body);
  }

  @Delete('app')
  disconnectApp(@CurrentUser() user: User) {
    return this.applicationSettingsService.disconnect(user, WorkspaceServiceSettingsKey.APP);
  }
}
