import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, JobsOptions, Job } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit {
  private redis: Redis;
  private queues: Record<string, Queue> = {};

  async onModuleInit() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
    this.queues = {
      collectLeads: new Queue('collect-leads', { connection: this.redis }),
      verifyEmail: new Queue('verify-email', { connection: this.redis }),
      sendEmail: new Queue('send-email', { connection: this.redis }),
      inboxPoll: new Queue('inbox-poll', { connection: this.redis }),
      statsDaily: new Queue('stats-daily', { connection: this.redis }),
      aiCollect: new Queue('ai-collect', { connection: this.redis }),
      aiWrite: new Queue('ai-write', { connection: this.redis }),
      aiSend: new Queue('ai-send', { connection: this.redis }),
    };
  }

  private getQueue(name: string): Queue {
    if (!this.queues[name]) throw new Error(`Queue ${name} not initialized`);
    return this.queues[name];
  }

  async addCollectLeadsJob(tenantId: string, data: any, opts?: JobsOptions) {
    return this.getQueue('collectLeads').add('collect', { tenantId, ...data }, {
      ...opts,
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  async addVerifyEmailJob(contactId: string, email: string, tenantId: string, opts?: JobsOptions) {
    return this.getQueue('verifyEmail').add('verify', { contactId, email, tenantId }, {
      ...opts,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
    });
  }

  async addSendEmailJob(data: {
    tenantId: string;
    campaignContactId: string;
    toEmail: string;
    toName: string;
    subject: string;
    body: string;
    channel: string;
  }, opts?: JobsOptions) {
    return this.getQueue('sendEmail').add('send', data, {
      ...opts,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
    });
  }

  async addInboxPollJob(tenantId: string, accountId: string, opts?: JobsOptions) {
    return this.getQueue('inboxPoll').add('poll', { tenantId, accountId }, {
      ...opts,
      repeat: { every: 60000 },
      removeOnComplete: 50,
    });
  }

  async addStatsDailyJob(tenantId: string, opts?: JobsOptions) {
    return this.getQueue('statsDaily').add('aggregate', { tenantId }, {
      ...opts,
      repeat: { pattern: '0 1 * * *' },
      removeOnComplete: 10,
    });
  }

  async addVerifyEmailBatch(contacts: Array<{ id: string; email: string; tenantId: string }>) {
    const jobs = contacts.map(c => ({
      name: 'verify',
      data: { contactId: c.id, email: c.email, tenantId: c.tenantId },
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 3000 } } as JobsOptions,
    }));
    return this.getQueue('verifyEmail').addBulk(jobs);
  }

  async addAiCollectJob(tenantId: string, opts?: JobsOptions) {
    return this.getQueue('aiCollect').add('ai-collect', { tenantId }, {
      ...opts, removeOnComplete: 50, removeOnFail: 100,
    });
  }

  async addAiWriteJob(tenantId: string, opts?: JobsOptions) {
    return this.getQueue('aiWrite').add('ai-write', { tenantId }, {
      ...opts, removeOnComplete: 50, removeOnFail: 100,
    });
  }

  async addAiSendJob(tenantId: string, opts?: JobsOptions) {
    return this.getQueue('aiSend').add('ai-send', { tenantId }, {
      ...opts, removeOnComplete: 50, removeOnFail: 100,
    });
  }

  async setupAiSchedules(tenantId: string, enabled: boolean) {
    // Remove existing repeatable jobs for this tenant across all AI queues
    for (const queueName of ['aiCollect', 'aiWrite', 'aiSend']) {
      const queue = this.getQueue(queueName);
      const repeatableJobs = await queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id?.includes(tenantId)) {
          await queue.removeRepeatableByKey(job.key);
        }
      }
    }

    if (enabled) {
      const defaults = [
        { queue: 'aiCollect', name: 'ai-collect', pattern: '0 9 * * *' },
        { queue: 'aiWrite', name: 'ai-write', pattern: '0 10 * * *' },
        { queue: 'aiSend', name: 'ai-send', pattern: '0 */2 * * *' },
      ];
      for (const def of defaults) {
        await this.getQueue(def.queue).add(def.name, { tenantId }, {
          repeat: { pattern: def.pattern },
          jobId: `${def.name}-${tenantId}`,
          removeOnComplete: 50,
        });
      }
    }
  }

  async getJobStatus(queueName: string, jobId: string): Promise<{ state: string; result?: any; progress?: number; failedReason?: string } | null> {
    const queue = this.getQueue(queueName);
    const job = await Job.fromId(queue, jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      state,
      result: job.returnvalue,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      failedReason: job.failedReason || undefined,
    };
  }
}
