import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayStats, funnel, recentTrends] = await Promise.all([
      this.prisma.dailyStats.findUnique({ where: { tenantId_date: { tenantId, date: today } } }),
      this.getFunnelData(tenantId),
      this.getRecentTrends(tenantId),
    ]);

    return {
      todayStats: todayStats || { collectedCount: 0, verifiedCount: 0, sentCount: 0, openedCount: 0, clickedCount: 0, repliedCount: 0, bouncedCount: 0, hotLeadCount: 0 },
      funnel,
      trends: recentTrends,
    };
  }

  async funnel(tenantId: string) {
    return { success: true, data: await this.getFunnelData(tenantId) };
  }

  async export(tenantId: string) {
    const trends = await this.getRecentTrends(tenantId);
    return trends;
  }

  private async getFunnelData(tenantId: string) {
    const [collected, verified, sent, opened, replied] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, status: { not: 'deleted' } } }),
      this.prisma.contact.count({ where: { tenantId, verificationStatus: 'valid' } }),
      this.prisma.campaignContact.count({ where: { campaign: { tenantId }, status: { in: ['sent', 'opened', 'clicked', 'replied'] } } }),
      this.prisma.campaignContact.count({ where: { campaign: { tenantId }, openedAt: { not: null } } }),
      this.prisma.campaignContact.count({ where: { campaign: { tenantId }, repliedAt: { not: null } } }),
    ]);
    const hotLeads = await this.prisma.inboxThread.count({ where: { tenantId, isHotLead: true } });
    return { collected, verified, sent, opened, replied, hotLeads };
  }

  private async getRecentTrends(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const stats = await this.prisma.dailyStats.findMany({
      where: { tenantId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    });
    return stats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      sent: s.sentCount,
      replied: s.repliedCount,
    }));
  }
}
