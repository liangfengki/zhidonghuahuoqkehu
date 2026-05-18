import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';

@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) {}

  async listThreads(tenantId: string, filters: { status?: string; isHotLead?: boolean; assignedUserId?: string; page?: number; pageSize?: number }) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.isHotLead !== undefined) where.isHotLead = filters.isHotLead;
    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;

    const [data, total] = await Promise.all([
      this.prisma.inboxThread.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
          assignedUser: { select: { id: true, name: true } },
          _count: { select: { messages: true } } },
        orderBy: { lastMessageAt: 'desc' },
        skip: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20),
        take: filters.pageSize ?? 20,
      }),
      this.prisma.inboxThread.count({ where }),
    ]);
    return { data, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
  }

  async getThread(tenantId: string, id: string) {
    const thread = await this.prisma.inboxThread.findFirst({
      where: { id, tenantId },
      include: {
        contact: true, campaign: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        messages: { orderBy: { receivedAt: 'asc' } },
      },
    });
    if (!thread) throw new NotFoundException('线程不存在');

    await this.prisma.inboxMessage.updateMany({
      where: { threadId: id, isRead: false },
      data: { isRead: true },
    });

    return thread;
  }

  async reply(tenantId: string, threadId: string, body: string) {
    const thread = await this.prisma.inboxThread.findFirst({ where: { id: threadId, tenantId } });
    if (!thread) throw new NotFoundException('线程不存在');

    return this.prisma.inboxMessage.create({
      data: {
        threadId, direction: 'outbound',
        fromEmail: 'support@example.com', toEmail: thread.contactId ? 'contact@example.com' : 'unknown',
        body, headers: {}, receivedAt: new Date(),
      },
    });
  }

  async assign(tenantId: string, threadId: string, userId: string) {
    const thread = await this.prisma.inboxThread.findFirst({ where: { id: threadId, tenantId } });
    if (!thread) throw new NotFoundException('线程不存在');
    return this.prisma.inboxThread.update({ where: { id: threadId }, data: { assignedUserId: userId } });
  }

  async updateStatus(tenantId: string, threadId: string, status: string) {
    const thread = await this.prisma.inboxThread.findFirst({ where: { id: threadId, tenantId } });
    if (!thread) throw new NotFoundException('线程不存在');
    return this.prisma.inboxThread.update({ where: { id: threadId }, data: { status } });
  }
}
