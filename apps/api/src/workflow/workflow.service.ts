import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';
import { QueueService } from '../queue/queue.service';
import { CollectEmailsDto } from './dto/collect-emails.dto';
import { GenerateEmailsDto } from './dto/generate-emails.dto';
import { SendEmailsDto } from './dto/send-emails.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { WebScraperAdapter } from '@b2b-lead-gen/data-sources';
import { EmailSender } from '@b2b-lead-gen/email-engine';
import { AiClient } from '@b2b-lead-gen/ai-engine';
import type { SmtpConfig } from '@b2b-lead-gen/email-engine';

@Injectable()
export class WorkflowService {
  private webScraper = new WebScraperAdapter();
  private emailSender = new EmailSender();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async collectEmails(tenantId: string, dto: CollectEmailsDto) {
    const sources = dto.sources || ['apollo', 'hunter', 'web-scraper'];

    // Handle user-provided URLs with web scraper
    if (dto.urls && dto.urls.length > 0 && sources.includes('web-scraper')) {
      const allContacts: any[] = [];
      for (const url of dto.urls) {
        try {
          const results = await this.webScraper.findByUrl(url);
          for (const r of results) {
            const domain = r.email.split('@')[1];
            const company = await this.prisma.company.upsert({
              where: { tenantId_domain: { tenantId, domain } },
              update: {},
              create: { tenantId, name: domain, domain },
            });
            const existing = await this.prisma.contact.findUnique({
              where: { tenantId_email: { tenantId, email: r.email } },
            });
            if (!existing) {
              const contact = await this.prisma.contact.create({
                data: {
                  tenantId,
                  companyId: company.id,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  email: r.email,
                  position: r.position,
                  source: 'web-scraper',
                },
                include: { company: true },
              });
              allContacts.push(contact);
            }
          }
        } catch {}
      }
      return { jobId: null, contacts: allContacts, count: allContacts.length, method: 'direct' };
    }

    // Delegate to queue for async processing
    const job = await this.queueService.addCollectLeadsJob(tenantId, {
      industry: dto.industry || '',
      country: dto.country || '',
      keywords: dto.keywords || [],
      sources,
      companyDomains: dto.companyDomains || [],
    });
    return { jobId: job.id, message: '采集任务已创建', method: 'queue' };
  }

  async getCollectStatus(jobId: string) {
    const status = await this.queueService.getJobStatus('collectLeads', jobId);
    if (!status) return { state: 'not_found' };

    return {
      state: status.state,
      result: status.result,
      progress: status.progress,
      failedReason: status.failedReason,
    };
  }

  async listContacts(tenantId: string, query: { page?: number; pageSize?: number; search?: string }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const where: any = { tenantId, status: { not: 'deleted' } };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { company: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: { company: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async generateEmails(tenantId: string, dto: GenerateEmailsDto) {
    const config = await this.prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!config?.apiKey) throw new BadRequestException('请先在 AI 中心配置 API Key');

    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: dto.contactIds }, tenantId },
      include: { company: true },
    });

    if (contacts.length === 0) throw new BadRequestException('未找到选中的联系人');

    let template: any = null;
    if (dto.templateId) {
      template = await this.prisma.emailTemplate.findFirst({
        where: { id: dto.templateId, tenantId },
      });
    }

    const aiClient = new AiClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      model: config.model,
    });

    const drafts: any[] = [];
    for (const contact of contacts) {
      const prompt = this.buildEmailPrompt(contact, config.productDescription, template);
      try {
        const response = await aiClient.chat([
          { role: 'system', content: 'You are a B2B email copywriter. Always respond with valid JSON containing "subject" and "body" fields.' },
          { role: 'user', content: prompt },
        ], { temperature: 0.7, maxTokens: 1000 });

        let aiResult: { subject: string; body: string };
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch {
          aiResult = { subject: 'Business Proposal', body: response.content };
        }

        const draft = await this.prisma.aiEmailDraft.create({
          data: {
            tenantId,
            contactId: contact.id,
            subject: aiResult.subject,
            body: aiResult.body,
            status: 'draft',
          },
        });
        drafts.push(draft);
      } catch (err: any) {
        console.error(`AI email generation failed for ${contact.email}:`, err.message);
      }
    }

    return drafts;
  }

  async listDrafts(tenantId: string, query: { status?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.aiEmailDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiEmailDraft.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async updateDraft(tenantId: string, id: string, dto: UpdateDraftDto) {
    const draft = await this.prisma.aiEmailDraft.findFirst({ where: { id, tenantId } });
    if (!draft) throw new NotFoundException('草稿不存在');
    return this.prisma.aiEmailDraft.update({ where: { id }, data: dto });
  }

  async sendEmails(tenantId: string, dto: SendEmailsDto) {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: dto.emailAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('邮箱账户不存在');

    const drafts = await this.prisma.aiEmailDraft.findMany({
      where: { id: { in: dto.draftIds }, tenantId, status: { in: ['draft', 'approved'] } },
    });
    if (drafts.length === 0) throw new BadRequestException('未找到可发送的草稿');

    const smtpConfig = account.smtpConfig as unknown as SmtpConfig;
    const results: any[] = [];

    for (const draft of drafts) {
      let toEmail = '';
      let toName = '';
      if (draft.contactId) {
        const contact = await this.prisma.contact.findUnique({ where: { id: draft.contactId } });
        if (contact) {
          toEmail = contact.email;
          toName = `${contact.firstName} ${contact.lastName}`.trim();
        }
      }

      if (!toEmail) {
        results.push({ draftId: draft.id, success: false, error: '无收件人邮箱' });
        continue;
      }

      const sendResult = await this.emailSender.send(
        {
          to: toEmail,
          toName,
          subject: draft.subject,
          htmlBody: draft.body,
          trackingEnabled: false,
          campaignContactId: draft.id,
          tenantId,
        },
        {
          provider: 'smtp',
          apiKey: '',
          senderEmail: account.email,
          smtpConfig,
          dailyLimit: account.dailyLimit,
          dailySent: account.dailySent,
          status: 'active',
        },
      );

      if (sendResult.success) {
        await this.prisma.aiEmailDraft.update({
          where: { id: draft.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        await this.prisma.emailAccount.update({
          where: { id: account.id },
          data: { dailySent: { increment: 1 } },
        });
      }

      results.push({ draftId: draft.id, ...sendResult });
    }

    return results;
  }

  async getFeedback(tenantId: string, query: { page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [threads, total] = await Promise.all([
      this.prisma.inboxThread.findMany({
        where: { tenantId },
        include: {
          messages: { orderBy: { receivedAt: 'desc' }, take: 5 },
          contact: true,
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inboxThread.count({ where: { tenantId } }),
    ]);

    return { data: threads, total, page, pageSize };
  }

  private buildEmailPrompt(contact: any, productDescription: string, template: any): string {
    const companyName = contact.company?.name || 'Unknown Company';
    const contactName = `${contact.firstName} ${contact.lastName}`.trim();

    if (template) {
      return `Generate a professional B2B cold email in HTML format.

Template subject: ${template.subject}
Template body: ${template.body}

Recipient: ${contactName}, ${contact.position || 'Manager'} at ${companyName} (${contact.email})
Product/Service context: ${productDescription}

Replace template variables with actual values. Return JSON: {"subject": "...", "body": "..."}
Body must be valid HTML.`;
    }

    return `Generate a professional B2B cold email in HTML format.

Recipient: ${contactName}, ${contact.position || 'Manager'} at ${companyName} (${contact.email})
Product/Service: ${productDescription}

Requirements:
- Personalized opening referencing their company
- Brief value proposition
- Clear call to action
- Professional signature
- Keep under 200 words

Return JSON: {"subject": "...", "body": "..."}
Body must be valid HTML.`;
  }
}
