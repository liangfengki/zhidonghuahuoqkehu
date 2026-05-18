import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CollectDto } from './dto/collect.dto';
import { QueueService } from '../queue/queue.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async list(tenantId: string, dto: PaginationDto & { industry?: string; country?: string; verificationStatus?: string; source?: string; scoreMin?: number; scoreMax?: number }) {
    const where: Prisma.ContactWhereInput = { tenantId, status: { not: 'deleted' } };

    if (dto.search) {
      where.OR = [
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { company: { name: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }
    if (dto.industry) where.company = { ...(where.company as object || {}), industry: dto.industry } as any;
    if (dto.verificationStatus) where.verificationStatus = dto.verificationStatus;
    if (dto.source) where.source = dto.source;
    if (dto.scoreMin !== undefined || dto.scoreMax !== undefined) {
      where.score = { gte: dto.scoreMin ?? 0, lte: dto.scoreMax ?? 100 };
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: { company: true },
        skip: ((dto.page ?? 1) - 1) * (dto.pageSize ?? 20),
        take: dto.pageSize ?? 20,
        orderBy: { [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, page: dto.page ?? 1, pageSize: dto.pageSize ?? 20 };
  }

  async getById(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: { company: true },
    });
    if (!contact) throw new NotFoundException('线索不存在');
    return contact;
  }

  async create(tenantId: string, dto: CreateLeadDto) {
    const company = await this.prisma.company.upsert({
      where: { tenantId_domain: { tenantId, domain: dto.domain } },
      update: {},
      create: {
        tenantId, name: dto.companyName, domain: dto.domain,
        industry: dto.industry, country: dto.country,
      },
    });

    const existing = await this.prisma.contact.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      return this.prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: dto.firstName, lastName: dto.lastName,
          position: dto.position, linkedinUrl: dto.linkedinUrl,
          phone: dto.phone, source: dto.source || 'manual_import',
          companyId: company.id,
        },
        include: { company: true },
      });
    }

    return this.prisma.contact.create({
      data: {
        tenantId, companyId: company.id,
        firstName: dto.firstName, lastName: dto.lastName, email: dto.email,
        position: dto.position, linkedinUrl: dto.linkedinUrl, phone: dto.phone,
        source: dto.source || 'manual_import',
      },
      include: { company: true },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateLeadDto>) {
    const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
    if (!contact) throw new NotFoundException('线索不存在');

    return this.prisma.contact.update({
      where: { id },
      data: {
        firstName: dto.firstName, lastName: dto.lastName,
        position: dto.position, linkedinUrl: dto.linkedinUrl, phone: dto.phone,
      },
      include: { company: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
    if (!contact) throw new NotFoundException('线索不存在');

    return this.prisma.contact.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  async importCSV(tenantId: string, rows: Record<string, string>[]) {
    let success = 0, failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        await this.create(tenantId, {
          companyName: row.company || row['公司名'] || 'Unknown',
          domain: row.domain || row['域名'] || '',
          industry: row.industry || row['行业'],
          country: row.country || row['国家'],
          firstName: row.firstName || row.first_name || row['姓'] || '',
          lastName: row.lastName || row.last_name || row['名'] || '',
          email: row.email || row['邮箱'] || '',
          position: row.position || row.title || row['职位'],
          linkedinUrl: row.linkedin || row.linkedinUrl,
          phone: row.phone || row['电话'],
          source: 'csv_import',
        });
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    return { total: rows.length, success, failed, errors };
  }

  async exportCSV(tenantId: string, dto: any) {
    const result = await this.list(tenantId, dto);
    return result.data.map((c: any) => ({
      company: c.company?.name || '',
      domain: c.company?.domain || '',
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      position: c.position || '',
      linkedin: c.linkedinUrl || '',
      industry: c.company?.industry || '',
      country: c.company?.country || '',
      verification: c.verificationStatus,
      source: c.source,
      score: c.score,
    }));
  }

  async collect(tenantId: string, dto: CollectDto) {
    const job = await this.queueService.addCollectLeadsJob(tenantId, dto);
    return { jobId: job.id, message: '采集任务已创建，队列处理中' };
  }

  async enrich(tenantId: string, id: string) {
    const contact = await this.getById(tenantId, id);
    const company = contact.company as any;

    if (company?.domain) {
      await this.queueService.addCollectLeadsJob(tenantId, {
        industry: company.industry || '',
        country: company.country || '',
        keywords: [company.name],
        sources: ['apollo', 'hunter'],
        companyDomains: [company.domain],
      });
    }

    return { message: '数据补全任务已创建' };
  }
}
