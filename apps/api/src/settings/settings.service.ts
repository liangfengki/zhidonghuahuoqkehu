import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';
import { QueueService } from '../queue/queue.service';
import { hash } from 'bcryptjs';
import {
  resolveEmailProvider,
  buildSmtpConfig,
  buildImapConfig,
} from '@b2b-lead-gen/shared';
import type { CreateEmailAccountDto } from './dto/create-email-account.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private queueService: QueueService) {}

  // Integrations
  async getApiKeys(tenantId: string) {
    return this.prisma.sendChannel.findMany({ where: { tenantId },
      select: { id: true, provider: true, dailyLimit: true, dailySent: true, status: true, createdAt: true } });
  }

  async upsertApiKey(tenantId: string, provider: string, apiKey: string, dailyLimit?: number) {
    return this.prisma.sendChannel.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      update: { apiKey, dailyLimit: dailyLimit ?? 300 },
      create: { tenantId, provider, apiKey, dailyLimit: dailyLimit ?? 300 },
    });
  }

  // Email Accounts
  async listEmailAccounts(tenantId: string) {
    return this.prisma.emailAccount.findMany({ where: { tenantId } });
  }

  async createEmailAccount(tenantId: string, dto: CreateEmailAccountDto) {
    if (!dto.email) throw new BadRequestException('邮箱不能为空');
    if (!dto.password) throw new BadRequestException('密码/授权码不能为空');

    const { key, preset } = resolveEmailProvider(dto.email, dto.provider);
    const providerKey = key || 'custom';

    const smtpConfig = dto.smtpConfig?.host
      ? dto.smtpConfig
      : buildSmtpConfig(dto.email, dto.password, preset?.smtp);

    const imapConfig = dto.imapConfig?.host
      ? dto.imapConfig
      : buildImapConfig(dto.email, dto.password, preset?.imap);

    if (!smtpConfig.host || !imapConfig.host) {
      throw new BadRequestException('未识别到邮箱服务商，请手动填写 SMTP/IMAP 配置');
    }

    return this.prisma.emailAccount.create({
      data: {
        tenantId,
        email: dto.email,
        provider: providerKey,
        smtpConfig: smtpConfig as any,
        imapConfig: imapConfig as any,
        dailyLimit: dto.dailyLimit ?? 500,
      },
    });
  }

  async updateEmailAccount(tenantId: string, id: string, dto: CreateEmailAccountDto) {
    const acc = await this.prisma.emailAccount.findFirst({ where: { id, tenantId } });
    if (!acc) throw new NotFoundException('账户不存在');

    const email = dto.email || acc.email;
    const password = dto.password || (acc.smtpConfig as any)?.password || '';
    const { key, preset } = resolveEmailProvider(email, dto.provider);

    const smtpConfig = dto.smtpConfig?.host
      ? dto.smtpConfig
      : buildSmtpConfig(email, password, preset?.smtp);

    const imapConfig = dto.imapConfig?.host
      ? dto.imapConfig
      : buildImapConfig(email, password, preset?.imap);

    return this.prisma.emailAccount.update({
      where: { id },
      data: {
        email,
        provider: key || acc.provider || 'custom',
        smtpConfig: smtpConfig as any,
        imapConfig: imapConfig as any,
        ...(dto.dailyLimit ? { dailyLimit: dto.dailyLimit } : {}),
      },
    });
  }

  async deleteEmailAccount(tenantId: string, id: string) {
    const acc = await this.prisma.emailAccount.findFirst({ where: { id, tenantId } });
    if (!acc) throw new NotFoundException('账户不存在');
    return this.prisma.emailAccount.delete({ where: { id } });
  }

  // Send Channels
  async listSendChannels(tenantId: string) {
    return this.prisma.sendChannel.findMany({ where: { tenantId } });
  }

  async createSendChannel(tenantId: string, dto: { provider: string; apiKey: string; dailyLimit?: number; senderEmail?: string; senderName?: string }) {
    const existing = await this.prisma.sendChannel.findFirst({ where: { tenantId, provider: dto.provider } });
    if (existing) throw new ConflictException(`渠道 ${dto.provider} 已存在`);
    return this.prisma.sendChannel.create({
      data: {
        tenantId,
        provider: dto.provider,
        apiKey: dto.apiKey,
        dailyLimit: dto.dailyLimit ?? 300,
        status: 'active',
      },
    });
  }

  async deleteSendChannel(tenantId: string, id: string) {
    const channel = await this.prisma.sendChannel.findFirst({ where: { id, tenantId } });
    if (!channel) throw new NotFoundException('通道不存在');
    return this.prisma.sendChannel.delete({ where: { id } });
  }

  // Blacklist
  async listBlacklist(tenantId: string) {
    return this.prisma.blacklist.findMany({ where: { tenantId } });
  }

  async addBlacklist(tenantId: string, type: string, value: string, reason?: string) {
    return this.prisma.blacklist.create({ data: { tenantId, type, value, reason } });
  }

  async removeBlacklist(tenantId: string, id: string) {
    const item = await this.prisma.blacklist.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('黑名单项不存在');
    return this.prisma.blacklist.delete({ where: { id } });
  }

  // Users
  async listUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
  }

  async createUser(tenantId: string, dto: { email: string; name: string; password: string; role?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('邮箱已存在');
    const passwordHash = await hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? 'sales',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateUser(tenantId: string, id: string, dto: { name?: string; role?: string }) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, email: true, name: true, role: true } });
  }

  async deleteUser(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.delete({ where: { id } });
  }

  // AI Config
  async getAiConfig(tenantId: string) {
    return this.prisma.aiConfig.findUnique({ where: { tenantId } });
  }

  async getCollectDefaults(tenantId: string) {
    const config = await this.prisma.aiConfig.findUnique({ where: { tenantId } });
    return (config?.collectDefaults as Record<string, unknown>) || {};
  }

  async upsertCollectDefaults(tenantId: string, dto: Record<string, unknown>) {
    const config = await this.prisma.aiConfig.findUnique({ where: { tenantId } });
    const current = (config?.collectDefaults as Record<string, unknown>) || {};

    return this.prisma.aiConfig.upsert({
      where: { tenantId },
      update: {
        collectDefaults: { ...current, ...dto } as any,
      },
      create: {
        tenantId,
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: '',
        model: 'deepseek/deepseek-v4-flash:free',
        collectDefaults: dto as any,
      },
    });
  }

  async upsertAiConfig(tenantId: string, dto: any) {
    const result = await this.prisma.aiConfig.upsert({
      where: { tenantId },
      update: {
        apiUrl: dto.apiUrl, apiKey: dto.apiKey, model: dto.model,
        productDescription: dto.productDescription,
        automationEnabled: dto.automationEnabled,
      },
      create: {
        tenantId,
        apiUrl: dto.apiUrl || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: dto.apiKey, model: dto.model || 'deepseek/deepseek-v4-flash:free',
        productDescription: dto.productDescription || '',
        automationEnabled: dto.automationEnabled ?? false,
      },
    });

    // Set up cron schedules based on automationEnabled
    try {
      await this.queueService.setupAiSchedules(tenantId, result.automationEnabled);
    } catch (e: any) {
      console.error('Failed to setup AI schedules:', e.message);
    }

    return result;
  }

  async extractProduct(tenantId: string, productDescription: string) {
    const config = await this.prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!config?.apiKey) throw new BadRequestException('请先配置 AI API Key');

    const { ProductExtractor } = await import('@b2b-lead-gen/ai-engine');
    const extractor = new ProductExtractor({ apiUrl: config.apiUrl, apiKey: config.apiKey, model: config.model });
    const extracted = await extractor.extract(productDescription);

    await this.prisma.aiConfig.update({
      where: { tenantId },
      data: {
        productDescription,
        extractedKeywords: extracted.keywords,
        extractedIndustry: extracted.industry,
        extractedCountry: extracted.country,
      },
    });

    return extracted;
  }

  async triggerAiPipeline(tenantId: string) {
    const config = await this.prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!config?.apiKey) throw new BadRequestException('请先配置 AI API Key');
    if (!config.productDescription) throw new BadRequestException('请先填写产品描述');

    // If keywords not yet extracted, extract first
    if (!config.extractedKeywords) {
      const { ProductExtractor } = await import('@b2b-lead-gen/ai-engine');
      const extractor = new ProductExtractor({ apiUrl: config.apiUrl, apiKey: config.apiKey, model: config.model });
      const extracted = await extractor.extract(config.productDescription);
      await this.prisma.aiConfig.update({
        where: { tenantId },
        data: {
          extractedKeywords: extracted.keywords,
          extractedIndustry: extracted.industry,
          extractedCountry: extracted.country,
        },
      });
    }

    await this.queueService.addAiCollectJob(tenantId);
    return { message: 'AI 全流程已启动：采集 → 写邮件 → 发送' };
  }

  async listAiDrafts(tenantId: string, status?: string) {
    return this.prisma.aiEmailDraft.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateAiDraft(tenantId: string, id: string, dto: { status?: string; subject?: string; body?: string }) {
    const draft = await this.prisma.aiEmailDraft.findFirst({ where: { id, tenantId } });
    if (!draft) throw new NotFoundException('草稿不存在');
    return this.prisma.aiEmailDraft.update({ where: { id }, data: dto });
  }

  async deleteAiDraft(tenantId: string, id: string) {
    const draft = await this.prisma.aiEmailDraft.findFirst({ where: { id, tenantId } });
    if (!draft) throw new NotFoundException('草稿不存在');
    return this.prisma.aiEmailDraft.delete({ where: { id } });
  }
}
