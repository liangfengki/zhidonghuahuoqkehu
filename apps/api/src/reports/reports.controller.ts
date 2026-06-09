import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { ReportsService } from './reports.service';
import { stringify } from 'csv-stringify/sync';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  async dashboard(@CurrentTenant() tenantId: string) {
    return { success: true, data: await this.reportsService.dashboard(tenantId) };
  }

  @Get('funnel')
  async funnel(@CurrentTenant() tenantId: string) {
    return { success: true, data: await this.reportsService.funnel(tenantId) };
  }

  @Get('export')
  async export(@CurrentTenant() tenantId: string, @Res() res: Response) {
    const data = await this.reportsService.export(tenantId);
    const csv = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.send(csv);
  }
}
