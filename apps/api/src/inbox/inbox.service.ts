import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';
import { EmailSender } from '@b2b-lead-gen/email-engine';

@Injectable()
export class InboxService {
  private emailSender = new EmailSender();
  
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
    const thread = await this.prisma.inboxThread.findFirst({
      where: { id: threadId, tenantId },
      include: { contact: true, campaign: true },
    });
    if (!thread) throw new NotFoundException('线程不存在');
    if (!thread.contact) throw new BadRequestException('该线程没有关联联系人');

    // 获取可用的发送通道
    const channel = await this.prisma.sendChannel.findFirst({
      where: { tenantId, status: 'active' },
    });
    if (!channel) throw new BadRequestException('没有可用的发送通道，请先配置邮件发送渠道');

    // 获取发件人地址
    const senderEmail = channel.senderEmail || 'noreply@example.com';
    const senderName = channel.senderName || 'Sales Team';

    // 发送邮件
    const sendResult = await this.emailSender.send(
      {
        to: thread.contact.email,
        toName: `${thread.contact.firstName} ${thread.contact.lastName}`,
        subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
        htmlBody: body,
        trackingEnabled: false,
        campaignContactId: '',
        tenantId,
      },
      {
        provider: channel.provider as any,
        apiKey: channel.apiKey,
        senderEmail,
        senderName,
        dailyLimit: channel.dailyLimit,
        dailySent: channel.dailySent,
        status: channel.status as any,
      }
    );

    if (!sendResult.success) {
      throw new BadRequestException(`邮件发送失败: ${sendResult.error}`);
    }

    // 创建数据库记录
    return this.prisma.inboxMessage.create({
      data: {
        threadId,
        direction: 'outbound',
        fromEmail: senderEmail,
        toEmail: thread.contact.email,
        body,
        headers: {},
        receivedAt: new Date(),
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
