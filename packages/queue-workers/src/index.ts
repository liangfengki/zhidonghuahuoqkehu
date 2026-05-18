import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = { url: redisUrl };

// ---- Collect Leads Worker ----
const collectWorker = new Worker('collect-leads', async (job) => {
  const { tenantId, industry, country, keywords, sources, companyDomains } = job.data;
  console.log(`🔍 [Collect] ${industry}/${country}, keywords: ${keywords?.join(',')}, domains: ${companyDomains?.join(',')}`);

  // Dynamically import to avoid startup deps
  const { LeadCollectionService } = await import('@b2b-lead-gen/data-sources');
  const { PrismaClient } = await import('@prisma/client');

  const prisma = new PrismaClient();
  try {
    const service = new LeadCollectionService();
    const domains = companyDomains || [];
    if (domains.length === 0) {
      console.log('⚠️ [Collect] No domains provided, skipping');
      return;
    }

    // Get API keys from tenant settings
    const channels = await prisma.sendChannel.findMany({ where: { tenantId, status: 'active' } });
    const apolloKey = channels.find((c: any) => c.provider === 'apollo')?.apiKey || '';
    const hunterKey = channels.find((c: any) => c.provider === 'hunter')?.apiKey || '';

    for (const domain of domains) {
      const result = await service.collectFromDomain(domain, { apolloApiKey: apolloKey, hunterApiKey: hunterKey });

      // Upsert company
      const company = await prisma.company.upsert({
        where: { tenantId_domain: { tenantId, domain } },
        create: { tenantId, name: domain, domain, industry, country, score: 50 },
        update: { industry: industry || undefined, country: country || undefined },
      });

      // Store email pattern
      if (result.pattern) {
        await prisma.emailPattern.upsert({
          where: { tenantId_domain: { tenantId, domain } },
          create: { tenantId, domain, pattern: result.pattern, confidence: 0.6, sources: [result.source], emails: [] },
          update: { pattern: result.pattern, sources: [result.source] },
        });
      }

      // Create contacts
      for (const c of result.contacts) {
        if (!c.email) continue;
        try {
          await prisma.contact.upsert({
            where: { tenantId_email: { tenantId, email: c.email } },
            create: {
              tenantId, companyId: company.id,
              firstName: c.firstName, lastName: c.lastName, email: c.email,
              position: c.position, linkedinUrl: c.linkedinUrl,
              source: c.source, score: Math.round(c.confidence * 100),
              patternMatched: false,
            },
            update: { source: c.source, score: Math.round(c.confidence * 100) },
          });
        } catch (e: any) {
          console.error(`Failed to upsert contact ${c.email}:`, e.message);
        }
      }

      console.log(`📊 [Collect] ${domain}: ${result.contacts.length} contacts found via ${result.source}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 2 });

// ---- Verify Email Worker ----
const verifyWorker = new Worker('verify-email', async (job) => {
  const { contactId, email, tenantId } = job.data;
  console.log(`📧 [Verify] ${email}`);

  const { PrismaClient } = await import('@prisma/client');
  const { VerificationService } = await import('@b2b-lead-gen/data-sources');

  const prisma = new PrismaClient();
  try {
    const svc = new VerificationService();
    const result = await svc.verify(email);

    await prisma.contact.update({
      where: { id: contactId },
      data: { verificationStatus: result.status, score: result.status === 'valid' ? 80 : result.status === 'risky' ? 40 : 0 },
    });

    await prisma.leadSource.create({
      data: { contactId, source: `verify-${result.provider}`, rawData: result as any },
    });

    console.log(`✅ [Verify] ${email} → ${result.status} (via ${result.provider})`);
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 5 });

// ---- Send Email Worker ----
const sendWorker = new Worker('send-email', async (job) => {
  const { tenantId, campaignContactId, toEmail, toName, subject, body, channel } = job.data;
  console.log(`📤 [Send] ${toEmail} via ${channel}`);

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const sendChannel = await prisma.sendChannel.findUnique({
      where: { tenantId_provider: { tenantId, provider: channel } },
    });
    if (!sendChannel || sendChannel.status !== 'active') throw new Error(`Channel ${channel} not available`);

    const queueRecord = await prisma.sendQueue.create({
      data: { tenantId, campaignContactId, channel, toEmail, subject, body, status: 'sending' },
    });

    // Simulate send (in production, use the EmailSender from email-engine)
    await new Promise(r => setTimeout(r, 500));
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await prisma.sendQueue.update({
      where: { id: queueRecord.id },
      data: { status: 'sent', messageId, sentAt: new Date() },
    });

    await prisma.campaignContact.update({
      where: { id: campaignContactId },
      data: { status: 'sent', sentAt: new Date() },
    });

    await prisma.sendChannel.update({
      where: { id: sendChannel.id },
      data: { dailySent: sendChannel.dailySent + 1 },
    });

    console.log(`✅ [Send] ${toEmail} sent (msgId: ${messageId})`);
  } catch (err: any) {
    console.error(`❌ [Send] ${toEmail} failed:`, err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 10 });

// ---- Inbox Poll Worker ----
const inboxPollWorker = new Worker('inbox-poll', async (job) => {
  const { tenantId, accountId } = job.data;
  console.log(`📬 [Inbox] Polling account ${accountId}`);

  const { PrismaClient } = await import('@prisma/client');
  const { EmailReceiver } = await import('@b2b-lead-gen/email-engine');
  const { EmailTracker } = await import('@b2b-lead-gen/email-engine');

  const prisma = new PrismaClient();
  const tracker = new EmailTracker();
  try {
    const account = await prisma.emailAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!account) return;

    const receiver = new EmailReceiver();
    receiver.addAccount({
      host: (account.imapConfig as any)?.host || 'imap.gmail.com',
      port: (account.imapConfig as any)?.port || 993,
      user: account.email,
      password: (account.imapConfig as any)?.password || '',
      tls: true,
    });

    const messages = await receiver.checkInbox({
      host: (account.imapConfig as any)?.host || 'imap.gmail.com',
      port: (account.imapConfig as any)?.port || 993,
      user: account.email,
      password: (account.imapConfig as any)?.password || '',
      tls: true,
    });

    for (const msg of messages) {
      const isAutoReply = tracker.isAutoReply(msg.headers);
      if (isAutoReply) {
        console.log(`🤖 [Inbox] Auto-reply detected from ${msg.from}, skipping`);
        continue;
      }

      // Match to contact by email
      const contact = await prisma.contact.findFirst({
        where: { tenantId, email: msg.from },
      });

      // Find or create inbox thread
      let threadId: string;
      const existingThread = await prisma.inboxThread.findFirst({
        where: { contactId: contact?.id, subject: msg.subject },
      });

      if (existingThread) {
        threadId = existingThread.id;
        await prisma.inboxThread.update({
          where: { id: threadId },
          data: { lastMessageAt: new Date(), isHotLead: true, status: 'new' },
        });
      } else {
        // Find campaign contact match via References/In-Reply-To
        let campaignId: string | null = null;
        if (msg.inReplyTo || msg.references) {
          const ref = msg.inReplyTo || msg.references;
          const sendRecord = await prisma.sendQueue.findFirst({
            where: { messageId: ref?.split('<')[1]?.split('>')[0] },
            include: { campaignContact: true },
          });
          if (sendRecord) {
            campaignId = sendRecord.campaignContact.campaignId;
            await prisma.campaignContact.update({
              where: { id: sendRecord.campaignContactId },
              data: { status: 'replied', repliedAt: new Date() },
            });
          }
        }

        const thread = await prisma.inboxThread.create({
          data: {
            tenantId, contactId: contact?.id, campaignId,
            subject: msg.subject, lastMessageAt: new Date(), isHotLead: true, status: 'new',
          },
        });
        threadId = thread.id;
      }

      // Create inbox message
      await prisma.inboxMessage.create({
        data: {
          threadId, direction: 'inbound',
          fromEmail: msg.from, toEmail: msg.to,
          body: msg.bodyHtml || msg.bodyText, bodyText: msg.bodyText,
          headers: msg.headers,
          attachments: msg.attachments.map(a => ({
            filename: a.filename, contentType: a.contentType, size: a.size,
          })),
          isAutoReply,
          receivedAt: msg.receivedAt,
        },
      });

      console.log(`✅ [Inbox] Processed reply from ${msg.from}: "${msg.subject.slice(0, 50)}"`);
    }
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 3 });

// ---- Stats Worker ----
const statsWorker = new Worker('stats-daily', async (job) => {
  const { tenantId } = job.data;
  console.log(`📊 [Stats] Aggregating for tenant ${tenantId}`);

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      collectedCount, verifiedCount,
      sentResult, openedResult, clickedResult, repliedResult, bouncedResult,
      hotLeadCount,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId, status: { not: 'deleted' }, createdAt: { gte: today } } }),
      prisma.contact.count({ where: { tenantId, verificationStatus: 'valid', updatedAt: { gte: today } } }),
      prisma.campaignContact.count({ where: { campaign: { tenantId }, sentAt: { gte: today } } }),
      prisma.campaignContact.count({ where: { campaign: { tenantId }, openedAt: { gte: today } } }),
      prisma.campaignContact.count({ where: { campaign: { tenantId }, clickedAt: { gte: today } } }),
      prisma.campaignContact.count({ where: { campaign: { tenantId }, repliedAt: { gte: today } } }),
      prisma.sendQueue.count({ where: { tenantId, status: 'bounced', sentAt: { gte: today } } }),
      prisma.inboxThread.count({ where: { tenantId, isHotLead: true, updatedAt: { gte: today } } }),
    ]);

    await prisma.dailyStats.upsert({
      where: { tenantId_date: { tenantId, date: today } },
      create: { tenantId, date: today, collectedCount, verifiedCount, sentCount: sentResult, openedCount: openedResult, clickedCount: clickedResult, repliedCount: repliedResult, bouncedCount: bouncedResult, hotLeadCount },
      update: { collectedCount, verifiedCount, sentCount: sentResult, openedCount: openedResult, clickedCount: clickedResult, repliedCount: repliedResult, bouncedCount: bouncedResult, hotLeadCount },
    });

    console.log(`✅ [Stats] Aggregated: ${collectedCount} collected, ${sentResult} sent, ${repliedResult} replied, ${hotLeadCount} hot leads`);
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 1 });

console.log('🚀 All workers started');
console.log('   - collect-leads: 2 concurrency');
console.log('   - verify-email: 5 concurrency');
console.log('   - send-email: 10 concurrency');
console.log('   - inbox-poll: 3 concurrency');
console.log('   - stats-daily: 1 concurrency (runs at 1 AM daily)');
