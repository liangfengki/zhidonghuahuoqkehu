import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  async list(@CurrentTenant() tenantId: string) { return { success: true, data: await this.templatesService.list(tenantId) }; }

  @Post()
  async create(@CurrentTenant() tenantId: string, @Body() dto: { name: string; subject: string; body: string; language?: string }) {
    return { success: true, data: await this.templatesService.create(tenantId, dto) };
  }

  @Put(':id')
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.templatesService.update(tenantId, id, dto) };
  }

  @Delete(':id')
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.templatesService.delete(tenantId, id) };
  }

  @Post(':id/preview')
  async preview(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.templatesService.preview(tenantId, id) };
  }
}
