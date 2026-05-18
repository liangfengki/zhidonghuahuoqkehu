import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';
import { QueueService } from '../queue/queue.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId },
      include: { template: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId }, include: { template: true, sequence: true } });
    if (!campaign) throw new NotFoundException('活动不存在');
    return campaign;
  }

  async create(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        tenantId, name: dto.name,
        industryFilter: dto.industryFilter,
        countryFilter: dto.countryFilter,
        templateId: dto.templateId, sequenceId: dto.sequenceId,
        dailyLimit: dto.dailyLimit || 50,
        status: 'draft',
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCampaignDto>) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('活动不存在');
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async start(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { template: true },
    });
    if (!campaign) throw new NotFoundException('活动不存在');
    if (campaign.status === 'running') throw new Error('活动已在运行中');
    if (!campaign.template) throw new Error('请先关联邮件模板');

    const campaign2 = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'running' },
    });

    const contacts = await this.prisma.contact.findMany({
      where: {
        tenantId,
        verificationStatus: 'valid',
        company: {
          industry: Array.isArray(campaign.industryFilter) && (campaign.industryFilter as string[]).length ? { in: campaign.industryFilter as string[] } : undefined,
          country: Array.isArray(campaign.countryFilter) && (campaign.countryFilter as string[]).length ? { in: campaign.countryFilter as string[] } : undefined,
        },
      },
      include: { company: true },
      take: 100,
    });

    for (const contact of contacts) {
      const cc = await this.prisma.campaignContact.create({
        data: { campaignId: id, contactId: contact.id, status: 'pending' },
      });

      const subject = campaign.template.subject
        .replace('{{firstName}}', contact.firstName)
        .replace('{{companyName}}', (contact.company as any)?.name || '');
      const body = campaign.template.body
        .replace('{{firstName}}', contact.firstName)
        .replace('{{companyName}}', (contact.company as any)?.name || '');

      await this.queueService.addSendEmailJob({
        tenantId, campaignContactId: cc.id,
        toEmail: contact.email, toName: `${contact.firstName} ${contact.lastName}`,
        subject, body, channel: 'brevo',
      });
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { totalTargets: contacts.length, totalSent: contacts.length },
    });

    return { ...campaign2, targetsQueued: contacts.length };
  }

  async pause(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('活动不存在');
    return this.prisma.campaign.update({ where: { id }, data: { status: 'paused' } });
  }

  async getStats(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { campaignContacts: true } },
      },
    });
    if (!campaign) throw new NotFoundException('活动不存在');

    const statusCounts = await this.prisma.campaignContact.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });

    return {
      campaign,
      targets: (campaign as any)._count.campaignContacts,
      statusBreakdown: statusCounts.reduce((acc: any, s) => ({ ...acc, [s.status]: s._count }), {}),
    };
  }
}
