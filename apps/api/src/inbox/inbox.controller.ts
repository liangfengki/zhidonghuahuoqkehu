import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { InboxService } from './inbox.service';

@Controller('api/inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private inboxService: InboxService) {}

  @Get('threads')
  async list(@CurrentTenant() tenantId: string, @Query() q: any) {
    const data = await this.inboxService.listThreads(tenantId, {
      status: q.status, isHotLead: q.isHotLead === 'true' ? true : q.isHotLead === 'false' ? false : undefined,
      assignedUserId: q.assignedUserId, page: q.page ? Number(q.page) : 1, pageSize: q.pageSize ? Number(q.pageSize) : 20,
    });
    return { success: true, data: data.data, meta: { total: data.total, page: data.page, pageSize: data.pageSize } };
  }

  @Get('threads/:id')
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.inboxService.getThread(tenantId, id) };
  }

  @Post('threads/:id/reply')
  async reply(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: { body: string }) {
    return { success: true, data: await this.inboxService.reply(tenantId, id, dto.body) };
  }

  @Put('threads/:id/assign')
  async assign(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: { userId: string }) {
    return { success: true, data: await this.inboxService.assign(tenantId, id, dto.userId) };
  }

  @Put('threads/:id/status')
  async updateStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: { status: string }) {
    return { success: true, data: await this.inboxService.updateStatus(tenantId, id, dto.status) };
  }
}
