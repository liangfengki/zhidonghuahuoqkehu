import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = { url: redisUrl };

// ---- Collect Leads Worker ----
const collectWorker = new Worker('collect-leads', async (job) => {
  const { tenantId, industry, country, keywords, sources, companyDomains } = job.data;
  const keywordStr = Array.isArray(keywords) ? keywords.join(' ') : (keywords || '');
  console.log(`🔍 [Collect] ${industry}/${country}, keywords: ${keywordStr}, domains: ${companyDomains?.join(',')}`);

  const { LeadCollectionService } = await import('@b2b-lead-gen/data-sources');
  const { PrismaClient } = await import('@prisma/client');

  const prisma = new PrismaClient();
  try {
    const service = new LeadCollectionService();
    const domains = companyDomains || [];

    // Get API keys from tenant settings
    const channels = await prisma.sendChannel.findMany({ where: { tenantId, status: 'active' } });
    const apolloKey = channels.find((c: any) => c.provider === 'apollo')?.apiKey || '';
    const hunterKey = channels.find((c: any) => c.provider === 'hunter')?.apiKey || '';
    const config = { apolloApiKey: apolloKey, hunterApiKey: hunterKey };

    // Mode 1: Search by keywords when no domains provided
    if (domains.length === 0 && keywordStr) {
      console.log(`🔍 [Collect] Searching by keywords: "${keywordStr}"`);
      const contacts = await service.collectByKeywords(keywordStr, config, { industry, country });

      for (const c of contacts) {
        if (!c.email) continue;
        const domain = c.email.split('@')[1] || 'unknown';
        try {
          const company = await prisma.company.upsert({
            where: { tenantId_domain: { tenantId, domain } },
            create: { tenantId, name: domain, domain, industry, country, score: 50 },
            update: {},
          });
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
      console.log(`📊 [Collect] Keyword search: ${contacts.length} contacts found`);
      return;
    }

    // Mode 2: Search by specific domains
    if (domains.length === 0) {
      console.log('⚠️ [Collect] No domains or keywords provided, skipping');
      return;
    }

    for (const domain of domains) {
      const result = await service.collectFromDomain(domain, config);

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
  const { tenantId, campaignContactId, toEmail, toName, subject, body } = job.data;
  console.log(`📤 [Send] ${toEmail}`);

  const { PrismaClient } = await import('@prisma/client');
  const { EmailSender, ChannelRouter, EmailTracker, TemplateRenderer } = await import('@b2b-lead-gen/email-engine');

  const prisma = new PrismaClient();
  try {
    // Get all active channels for this tenant
    const channels = await prisma.sendChannel.findMany({
      where: { tenantId, status: 'active' },
    });
    if (channels.length === 0) throw new Error('No active send channels');

    // Use ChannelRouter to select the best provider for this recipient
    const router = new ChannelRouter();
    const channelInfo = channels.map(c => ({
      provider: c.provider as any,
      apiKey: c.apiKey,
      dailyLimit: c.dailyLimit,
      dailySent: c.dailySent,
      status: c.status as any,
    }));
    const selectedChannel = router.selectChannel(toEmail, channelInfo);
    if (!selectedChannel) throw new Error('No channel with remaining quota');

    const sendChannel = channels.find(c => c.provider === selectedChannel.provider)!;

    const queueRecord = await prisma.sendQueue.create({
      data: { tenantId, campaignContactId, channel: selectedChannel.provider, toEmail, subject, body, status: 'sending' },
    });

    // Inject tracking pixel and link tracking
    const tracker = new EmailTracker();
    const trackingId = tracker.generateTrackingId(campaignContactId);
    const trackedBody = tracker.injectTracking(body, trackingId);

    // Send via real email provider
    const sender = new EmailSender();
    const result = await sender.send(
      {
        to: toEmail,
        toName,
        subject,
        htmlBody: trackedBody,
        trackingEnabled: true,
        campaignContactId,
        tenantId,
      },
      selectedChannel,
    );

    if (!result.success) {
      await prisma.sendQueue.update({
        where: { id: queueRecord.id },
        data: { status: 'failed', errorMessage: result.error },
      });
      await prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: { status: 'failed' },
      });
      throw new Error(result.error || 'Send failed');
    }

    await prisma.sendQueue.update({
      where: { id: queueRecord.id },
      data: { status: 'sent', messageId: result.messageId, sentAt: result.sentAt },
    });

    await prisma.campaignContact.update({
      where: { id: campaignContactId },
      data: { status: 'sent', sentAt: result.sentAt },
    });

    await prisma.sendChannel.update({
      where: { id: sendChannel.id },
      data: { dailySent: sendChannel.dailySent + 1 },
    });

    console.log(`✅ [Send] ${toEmail} sent via ${result.channel} (msgId: ${result.messageId})`);
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

// ---- AI Collect Worker ----
const aiCollectWorker = new Worker('ai-collect', async (job) => {
  const { tenantId } = job.data;
  console.log(`🤖 [AI-Collect] Starting for tenant ${tenantId}`);

  const { PrismaClient } = await import('@prisma/client');
  const { LeadCollectionService } = await import('@b2b-lead-gen/data-sources');
  const { Queue } = await import('bullmq');

  const prisma = new PrismaClient();
  try {
    const aiConfig = await prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!aiConfig) { console.log('⏭️ [AI-Collect] No AI config, skipping'); return; }

    const channels = await prisma.sendChannel.findMany({ where: { tenantId, status: 'active' } });
    const apolloKey = channels.find((c: any) => c.provider === 'apollo')?.apiKey || '';
    const hunterKey = channels.find((c: any) => c.provider === 'hunter')?.apiKey || '';
    const config = { apolloApiKey: apolloKey, hunterApiKey: hunterKey };

    const service = new LeadCollectionService();
    const keywords = aiConfig.extractedKeywords || 'buyer importer';
    const industry = aiConfig.extractedIndustry || '';
    const country = aiConfig.extractedCountry || '';

    console.log(`🤖 [AI-Collect] Searching: keywords="${keywords}", industry="${industry}", country="${country}"`);
    const contacts = await service.collectByKeywords(keywords, config, { industry, country });

    let saved = 0;
    for (const c of contacts) {
      if (!c.email) continue;
      // Skip generic/role-based emails
      const localPart = c.email.split('@')[0].toLowerCase();
      const skipPrefixes = ['noreply', 'no-reply', 'postmaster', 'webmaster', 'abuse', 'security', 'mailer-daemon', '2d8d7644'];
      if (skipPrefixes.some(p => localPart.startsWith(p))) continue;

      const domain = c.email.split('@')[1] || 'unknown';
      try {
        const company = await prisma.company.upsert({
          where: { tenantId_domain: { tenantId, domain } },
          create: { tenantId, name: domain, domain, industry, country, score: 50 },
          update: {},
        });
        await prisma.contact.upsert({
          where: { tenantId_email: { tenantId, email: c.email } },
          create: {
            tenantId, companyId: company.id,
            firstName: c.firstName, lastName: c.lastName, email: c.email,
            position: c.position, linkedinUrl: c.linkedinUrl,
            source: 'ai_collect', score: Math.round(c.confidence * 100),
            verificationStatus: 'valid', // Mark as valid since found on real company website
            patternMatched: false,
          },
          update: { score: Math.round(c.confidence * 100), verificationStatus: 'valid' },
        });
        saved++;
      } catch {}
    }

    await prisma.aiConfig.update({ where: { tenantId }, data: { lastCollectAt: new Date() } });
    console.log(`✅ [AI-Collect] Done: ${saved} contacts saved from ${contacts.length} found`);

    // Chain: trigger ai-write
    const aiWriteQueue = new Queue('ai-write', { connection });
    await aiWriteQueue.add('ai-write', { tenantId }, { removeOnComplete: 50 });
    console.log(`🔗 [AI-Collect] Chained ai-write job`);
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 1 });

// ---- AI Write Worker ----
const aiWriteWorker = new Worker('ai-write', async (job) => {
  const { tenantId } = job.data;
  console.log(`🤖 [AI-Write] Starting for tenant ${tenantId}`);

  const { PrismaClient } = await import('@prisma/client');
  const { EmailWriter, LeadAnalyzer } = await import('@b2b-lead-gen/ai-engine');
  const { Queue } = await import('bullmq');

  const prisma = new PrismaClient();
  try {
    const aiConfig = await prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!aiConfig?.apiKey) { console.log('⏭️ [AI-Write] No API key, skipping'); return; }

    const writer = new EmailWriter({ apiUrl: aiConfig.apiUrl, apiKey: aiConfig.apiKey, model: aiConfig.model });
    const analyzer = new LeadAnalyzer({ apiUrl: aiConfig.apiUrl, apiKey: aiConfig.apiKey, model: aiConfig.model });

    // Get verified contacts without AI drafts
    const existingDraftContactIds = (await prisma.aiEmailDraft.findMany({
      where: { tenantId },
      select: { contactId: true },
    })).map(d => d.contactId).filter(Boolean);

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId,
        verificationStatus: 'valid',
        status: { not: 'deleted' },
        id: { notIn: existingDraftContactIds as string[] },
      },
      include: { company: true },
      take: 20,
    });

    if (contacts.length === 0) { console.log('⏭️ [AI-Write] No new contacts to write for'); return; }

    let generated = 0;
    let skipped = 0;
    for (const contact of contacts) {
      try {
        // Analyze lead quality first
        const analysis = await analyzer.analyzeLead({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          position: contact.position || undefined,
          companyName: (contact.company as any)?.name || undefined,
          industry: (contact.company as any)?.industry || undefined,
          country: (contact.company as any)?.country || undefined,
        });

        // Update contact score based on AI analysis
        if (analysis.score) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { score: analysis.score },
          });
        }

        // Skip low-quality leads (score < 40)
        if (analysis.score && analysis.score < 40) {
          console.log(`⏭️ [AI-Write] Skipping low-quality lead ${contact.email} (score: ${analysis.score})`);
          skipped++;
          continue;
        }

        const email = await writer.generateEmail({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          position: contact.position || undefined,
          companyName: (contact.company as any)?.name || undefined,
          industry: (contact.company as any)?.industry || undefined,
          country: (contact.company as any)?.country || undefined,
        }, aiConfig.productDescription || undefined);

        await prisma.aiEmailDraft.create({
          data: {
            tenantId,
            contactId: contact.id,
            subject: email.subject,
            body: email.body,
            status: 'draft', // Changed from 'approved' to 'draft' for review
          },
        });
        generated++;
        await new Promise(r => setTimeout(r, 1500)); // Rate limit
      } catch (e: any) {
        console.error(`❌ [AI-Write] Failed for ${contact.email}:`, e.message);
      }
    }

    await prisma.aiConfig.update({ where: { tenantId }, data: { lastWriteAt: new Date() } });
    console.log(`✅ [AI-Write] Done: ${generated} drafts generated, ${skipped} skipped for ${contacts.length} contacts`);

    // Chain: trigger ai-send
    const aiSendQueue = new Queue('ai-send', { connection });
    await aiSendQueue.add('ai-send', { tenantId }, { removeOnComplete: 50 });
    console.log(`🔗 [AI-Write] Chained ai-send job`);
  } finally {
    await prisma.$disconnect();
  }
}, { connection, concurrency: 1 });

// ---- AI Send Worker ----
const aiSendWorker = new Worker('ai-send', async (job) => {
  const { tenantId } = job.data;
  console.log(`🤖 [AI-Send] Starting for tenant ${tenantId}`);

  const { PrismaClient } = await import('@prisma/client');
  const { EmailSender, ChannelRouter, EmailTracker } = await import('@b2b-lead-gen/email-engine');

  const prisma = new PrismaClient();
  try {
    const aiConfig = await prisma.aiConfig.findUnique({ where: { tenantId } });
    if (!aiConfig) { console.log('⏭️ [AI-Send] No AI config, skipping'); return; }

    // Get approved drafts
    const drafts = await prisma.aiEmailDraft.findMany({
      where: { tenantId, status: 'approved' },
      take: 10,
    });

    if (drafts.length === 0) { console.log('⏭️ [AI-Send] No approved drafts to send'); return; }

    // Get channels
    const channels = await prisma.sendChannel.findMany({ where: { tenantId, status: 'active' } });
    if (channels.length === 0) { console.log('❌ [AI-Send] No active send channels'); return; }

    const router = new ChannelRouter();
    const sender = new EmailSender();
    const tracker = new EmailTracker();

    let sent = 0;
    for (const draft of drafts) {
      try {
        const contact = draft.contactId ? await prisma.contact.findUnique({
          where: { id: draft.contactId },
          include: { company: true },
        }) : null;

        if (!contact?.email) continue;

        const channelInfo = channels.map(c => ({
          provider: c.provider as any, apiKey: c.apiKey,
          dailyLimit: c.dailyLimit, dailySent: c.dailySent, status: c.status as any,
        }));
        const selectedChannel = router.selectChannel(contact.email, channelInfo);
        if (!selectedChannel) { console.log('⏭️ [AI-Send] No channel with quota'); break; }

        const sendChannel = channels.find(c => c.provider === selectedChannel.provider)!;
        const trackingId = tracker.generateTrackingId(draft.id);
        const trackedBody = tracker.injectTracking(draft.body, trackingId);

        const result = await sender.send({
          to: contact.email,
          toName: `${contact.firstName} ${contact.lastName}`,
          subject: draft.subject,
          htmlBody: trackedBody,
          trackingEnabled: true,
          campaignContactId: draft.id,
          tenantId,
        }, selectedChannel);

        if (result.success) {
          await prisma.aiEmailDraft.update({
            where: { id: draft.id },
            data: { status: 'sent', sentAt: new Date() },
          });
          await prisma.sendChannel.update({
            where: { id: sendChannel.id },
            data: { dailySent: sendChannel.dailySent + 1 },
          });
          sent++;
        } else {
          console.error(`❌ [AI-Send] Failed for ${contact.email}: ${result.error}`);
        }

        // Random delay between sends (30s to 3min)
        const delay = 30000 + Math.random() * 150000;
        await new Promise(r => setTimeout(r, delay));
      } catch (e: any) {
        console.error(`❌ [AI-Send] Error:`, e.message);
      }
    }

    await prisma.aiConfig.update({ where: { tenantId }, data: { lastSendAt: new Date() } });
    console.log(`✅ [AI-Send] Done: ${sent}/${drafts.length} sent`);
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
console.log('   - ai-collect: 1 concurrency (AI lead collection)');
console.log('   - ai-write: 1 concurrency (AI email writing)');
console.log('   - ai-send: 1 concurrency (AI email sending)');
