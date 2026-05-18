import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  async list(@CurrentTenant() tenantId: string) {
    return { success: true, data: await this.campaignsService.list(tenantId) };
  }

  @Post()
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCampaignDto) {
    return { success: true, data: await this.campaignsService.create(tenantId, dto) };
  }

  @Put(':id')
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    return { success: true, data: await this.campaignsService.update(tenantId, id, dto) };
  }

  @Post(':id/start')
  async start(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.campaignsService.start(tenantId, id) };
  }

  @Post(':id/pause')
  async pause(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.campaignsService.pause(tenantId, id) };
  }

  @Get(':id/stats')
  async stats(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.campaignsService.getStats(tenantId, id) };
  }
}
