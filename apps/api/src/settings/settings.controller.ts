import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { SettingsService } from './settings.service';
import { QueueService } from '../queue/queue.service';
import { CreateEmailAccountDto } from './dto/create-email-account.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService, private queueService: QueueService) {}

  // Integrations
  @Get('integrations')
  async getApiKeys(@CurrentTenant() t: string) { return { success: true, data: await this.settings.getApiKeys(t) }; }

  @Post('integrations')
  async upsertApiKey(@CurrentTenant() t: string, @Body() dto: { provider: string; apiKey: string; dailyLimit?: number }) {
    return { success: true, data: await this.settings.upsertApiKey(t, dto.provider, dto.apiKey, dto.dailyLimit) };
  }

  // Email Accounts
  @Get('email-accounts')
  async listEmailAccounts(@CurrentTenant() t: string) { return { success: true, data: await this.settings.listEmailAccounts(t) }; }
  @Post('email-accounts')
  async createEmailAccount(@CurrentTenant() t: string, @Body() dto: CreateEmailAccountDto) { return { success: true, data: await this.settings.createEmailAccount(t, dto) }; }
  @Put('email-accounts/:id')
  async updateEmailAccount(@CurrentTenant() t: string, @Param('id') id: string, @Body() dto: CreateEmailAccountDto) { return { success: true, data: await this.settings.updateEmailAccount(t, id, dto) }; }
  @Delete('email-accounts/:id')
  async deleteEmailAccount(@CurrentTenant() t: string, @Param('id') id: string) { return { success: true, data: await this.settings.deleteEmailAccount(t, id) }; }

  // Send Channels
  @Get('send-channels')
  async listSendChannels(@CurrentTenant() t: string) { return { success: true, data: await this.settings.listSendChannels(t) }; }
  @Post('send-channels')
  async createSendChannel(@CurrentTenant() t: string, @Body() dto: { provider: string; apiKey: string; dailyLimit?: number; senderEmail?: string; senderName?: string }) {
    return { success: true, data: await this.settings.createSendChannel(t, dto) };
  }
  @Delete('send-channels/:id')
  async deleteSendChannel(@CurrentTenant() t: string, @Param('id') id: string) { return { success: true, data: await this.settings.deleteSendChannel(t, id) }; }

  // Blacklist
  @Get('blacklist')
  async listBlacklist(@CurrentTenant() t: string) { return { success: true, data: await this.settings.listBlacklist(t) }; }
  @Post('blacklist')
  async addBlacklist(@CurrentTenant() t: string, @Body() dto: { type: string; value: string; reason?: string }) { return { success: true, data: await this.settings.addBlacklist(t, dto.type, dto.value, dto.reason) }; }
  @Delete('blacklist/:id')
  async removeBlacklist(@CurrentTenant() t: string, @Param('id') id: string) { return { success: true, data: await this.settings.removeBlacklist(t, id) }; }

  // Users
  @Get('users')
  async listUsers(@CurrentTenant() t: string) { return { success: true, data: await this.settings.listUsers(t) }; }
  @Post('users')
  async createUser(@CurrentTenant() t: string, @Body() dto: { email: string; name: string; password: string; role?: string }) {
    return { success: true, data: await this.settings.createUser(t, dto) };
  }
  @Put('users/:id')
  async updateUser(@CurrentTenant() t: string, @Param('id') id: string, @Body() dto: any) { return { success: true, data: await this.settings.updateUser(t, id, dto) }; }
  @Delete('users/:id')
  async deleteUser(@CurrentTenant() t: string, @Param('id') id: string) { return { success: true, data: await this.settings.deleteUser(t, id) }; }

  // AI Config
  @Get('ai')
  async getAiConfig(@CurrentTenant() t: string) { return { success: true, data: await this.settings.getAiConfig(t) }; }
  @Put('ai')
  async upsertAiConfig(@CurrentTenant() t: string, @Body() dto: any) { return { success: true, data: await this.settings.upsertAiConfig(t, dto) }; }

  // Collect Defaults
  @Get('collect-defaults')
  async getCollectDefaults(@CurrentTenant() t: string) { return { success: true, data: await this.settings.getCollectDefaults(t) }; }
  @Put('collect-defaults')
  async upsertCollectDefaults(@CurrentTenant() t: string, @Body() dto: Record<string, unknown>) { return { success: true, data: await this.settings.upsertCollectDefaults(t, dto) }; }

  // AI Extract product description
  @Post('ai/extract')
  async extractProduct(@CurrentTenant() t: string, @Body() dto: { productDescription: string }) {
    return { success: true, data: await this.settings.extractProduct(t, dto.productDescription) };
  }

  // AI Drafts
  @Get('ai/drafts')
  async listAiDrafts(@CurrentTenant() t: string) { return { success: true, data: await this.settings.listAiDrafts(t) }; }
  @Put('ai/drafts/:id')
  async updateAiDraft(@CurrentTenant() t: string, @Param('id') id: string, @Body() dto: any) { return { success: true, data: await this.settings.updateAiDraft(t, id, dto) }; }
  @Delete('ai/drafts/:id')
  async deleteAiDraft(@CurrentTenant() t: string, @Param('id') id: string) { return { success: true, data: await this.settings.deleteAiDraft(t, id) }; }

  // One-click pipeline trigger
  @Post('ai/trigger/run')
  async triggerAiPipeline(@CurrentTenant() t: string) {
    return { success: true, data: await this.settings.triggerAiPipeline(t) };
  }
}
