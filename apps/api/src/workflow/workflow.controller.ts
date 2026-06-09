import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { WorkflowService } from './workflow.service';
import { CollectEmailsDto } from './dto/collect-emails.dto';
import { GenerateEmailsDto } from './dto/generate-emails.dto';
import { SendEmailsDto } from './dto/send-emails.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';

@Controller('workflow')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Post('collect')
  async collect(@CurrentTenant() tenantId: string, @Body() dto: CollectEmailsDto) {
    return { success: true, data: await this.workflowService.collectEmails(tenantId, dto) };
  }

  @Get('collect/:jobId/status')
  async getCollectStatus(@Param('jobId') jobId: string) {
    return { success: true, data: await this.workflowService.getCollectStatus(jobId) };
  }

  @Get('contacts')
  async listContacts(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.workflowService.listContacts(tenantId, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
      search,
    });
    return { success: true, data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } };
  }

  @Post('generate-emails')
  async generateEmails(@CurrentTenant() tenantId: string, @Body() dto: GenerateEmailsDto) {
    return { success: true, data: await this.workflowService.generateEmails(tenantId, dto) };
  }

  @Get('drafts')
  async listDrafts(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.workflowService.listDrafts(tenantId, {
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
    return { success: true, data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } };
  }

  @Put('drafts/:id')
  async updateDraft(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateDraftDto) {
    return { success: true, data: await this.workflowService.updateDraft(tenantId, id, dto) };
  }

  @Post('send')
  async sendEmails(@CurrentTenant() tenantId: string, @Body() dto: SendEmailsDto) {
    return { success: true, data: await this.workflowService.sendEmails(tenantId, dto) };
  }

  @Get('feedback')
  async getFeedback(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.workflowService.getFeedback(tenantId, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return { success: true, data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } };
  }
}
