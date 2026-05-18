import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

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

  async createEmailAccount(tenantId: string, dto: any) {
    return this.prisma.emailAccount.create({ data: { tenantId, ...dto } });
  }

  async updateEmailAccount(tenantId: string, id: string, dto: any) {
    const acc = await this.prisma.emailAccount.findFirst({ where: { id, tenantId } });
    if (!acc) throw new NotFoundException('账户不存在');
    return this.prisma.emailAccount.update({ where: { id }, data: dto });
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
}
