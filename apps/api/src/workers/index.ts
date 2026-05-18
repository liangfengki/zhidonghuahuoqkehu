import 'reflect-metadata';
import Redis from 'ioredis';
import { Worker } from 'bullmq';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

// Collect Leads Worker
new Worker('collect-leads', async (job) => {
  console.log(`🔍 [Collect] Processing: ${job.data.industry} / ${job.data.country}`);
  // Collect using data-sources adapters
  console.log('✅ [Collect] Done');
}, { connection: redis, concurrency: 2 });

// Verify Email Worker
new Worker('verify-email', async (job) => {
  console.log(`📧 [Verify] ${job.data.email}`);
  // Use VerificationService
  console.log('✅ [Verify] Done');
}, { connection: redis, concurrency: 5 });

// Send Email Worker
new Worker('send-email', async (job) => {
  console.log(`📤 [Send] ${job.data.toEmail} via ${job.data.channel}`);
  // Use EmailSender
  console.log('✅ [Send] Done');
}, { connection: redis, concurrency: 10 });

// Inbox Poll Worker
new Worker('inbox-poll', async (job) => {
  console.log(`📬 [Inbox] Polling account ${job.data.accountId}`);
  // Use EmailReceiver
  console.log('✅ [Inbox] Done');
}, { connection: redis, concurrency: 3 });

// Stats Daily Worker
new Worker('stats-daily', async (job) => {
  console.log(`📊 [Stats] Aggregating stats for tenant ${job.data.tenantId}`);
  console.log('✅ [Stats] Done');
}, { connection: redis, concurrency: 1 });

console.log('🚀 All workers started');
