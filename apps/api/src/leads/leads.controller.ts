import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, Res, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CollectDto } from './dto/collect.dto';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

@Controller('api/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  async list(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('country') country?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('source') source?: string,
    @Query('scoreMin') scoreMin?: string,
    @Query('scoreMax') scoreMax?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const result = await this.leadsService.list(tenantId, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      search,
      industry,
      country,
      verificationStatus,
      source,
      scoreMin: scoreMin ? Number(scoreMin) : undefined,
      scoreMax: scoreMax ? Number(scoreMax) : undefined,
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder || 'desc') as 'asc' | 'desc',
    });
    return { success: true, data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } };
  }

  @Get(':id')
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.leadsService.getById(tenantId, id) };
  }

  @Post()
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateLeadDto) {
    return { success: true, data: await this.leadsService.create(tenantId, dto) };
  }

  @Put(':id')
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateLeadDto>) {
    return { success: true, data: await this.leadsService.update(tenantId, id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.leadsService.remove(tenantId, id) };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCSV(@CurrentTenant() tenantId: string, @UploadedFile() file: Express.Multer.File) {
    const rows = parse(file.buffer.toString(), { columns: true, skip_empty_lines: true });
    const result = await this.leadsService.importCSV(tenantId, rows);
    return { success: true, data: result };
  }

  @Get('export')
  async exportCSV(@CurrentTenant() tenantId: string, @Query() dto: any, @Res() res: Response) {
    const data = await this.leadsService.exportCSV(tenantId, dto);
    const csv = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  }

  @Post('collect')
  async collect(@CurrentTenant() tenantId: string, @Body() dto: CollectDto) {
    return { success: true, data: await this.leadsService.collect(tenantId, dto) };
  }

  @Post('enrich/:id')
  async enrich(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return { success: true, data: await this.leadsService.enrich(tenantId, id) };
  }
}
