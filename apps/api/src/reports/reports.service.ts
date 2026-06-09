import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayStats, funnel, recentTrends, activityLog, pendingCounts] = await Promise.all([
      this.prisma.dailyStats.findUnique({ where: { tenantId_date: { tenantId, date: today } } }),
      this.getFunnelData(tenantId),
      this.getRecentTrends(tenantId),
      this.getActivityLog(tenantId),
      this.getPendingCounts(tenantId),
    ]);

    return {
      todayStats: todayStats || { collectedCount: 0, verifiedCount: 0, sentCount: 0, openedCount: 0, clickedCount: 0, repliedCount: 0, bouncedCount: 0, hotLeadCount: 0 },
      funnel,
      trends: recentTrends,
      activities: activityLog,
      pending: pendingCounts,
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

  private async getActivityLog(tenantId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [recentContacts, recentCampaigns, recentThreads] = await Promise.all([
      this.prisma.contact.findMany({
        where: { tenantId, createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { firstName: true, lastName: true, email: true, createdAt: true },
      }),
      this.prisma.campaignContact.findMany({
        where: { campaign: { tenantId }, sentAt: { gte: oneDayAgo } },
        orderBy: { sentAt: 'desc' },
        take: 5,
        select: { sentAt: true, status: true },
      }),
      this.prisma.inboxThread.findMany({
        where: { tenantId, lastMessageAt: { gte: oneDayAgo } },
        orderBy: { lastMessageAt: 'desc' },
        take: 5,
        select: { subject: true, isHotLead: true, lastMessageAt: true },
      }),
    ]);

    const activities: Array<{ time: string; type: string; text: string }> = [];
    
    recentContacts.forEach(c => {
      activities.push({
        time: c.createdAt.toTimeString().slice(0, 5),
        type: 'collect',
        text: `新增线索 ${c.firstName} ${c.lastName} (${c.email})`,
      });
    });

    recentCampaigns.forEach(c => {
      if (c.sentAt) {
        activities.push({
          time: c.sentAt.toTimeString().slice(0, 5),
          type: 'send',
          text: `发送邮件 - 状态: ${c.status}`,
        });
      }
    });

    recentThreads.forEach(t => {
      activities.push({
        time: t.lastMessageAt.toTimeString().slice(0, 5),
        type: t.isHotLead ? 'hot' : 'reply',
        text: t.isHotLead ? `热线索回复: ${t.subject}` : `新回复: ${t.subject}`,
      });
    });

    return activities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }

  private async getPendingCounts(tenantId: string) {
    const [drafts, unreadThreads, pendingContacts] = await Promise.all([
      this.prisma.aiEmailDraft.count({ where: { tenantId, status: 'draft' } }),
      this.prisma.inboxThread.count({ where: { tenantId, status: 'new' } }),
      this.prisma.contact.count({ where: { tenantId, verificationStatus: 'pending' } }),
    ]);

    return { drafts, unreadThreads, pendingContacts };
  }
}
