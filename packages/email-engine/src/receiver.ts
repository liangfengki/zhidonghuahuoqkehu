import type { ReceiveMessage } from './types';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export class EmailReceiver {
  private configs: ImapConfig[] = [];

  addAccount(config: ImapConfig): void {
    this.configs.push(config);
  }

  removeAccount(email: string): void {
    this.configs = this.configs.filter(c => c.user !== email);
  }

  getAccounts(): ImapConfig[] {
    return [...this.configs];
  }

  async checkInbox(config: ImapConfig): Promise<ReceiveMessage[]> {
    try {
      const client = new ImapFlow({
        host: config.host, port: config.port, secure: config.tls,
        auth: { user: config.user, pass: config.password }, logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages: ReceiveMessage[] = [];
        for await (const msg of client.fetch('1:*', { source: true })) {
          const parsed = await simpleParser(msg.source!);
          messages.push(this.parseMessage(msg.seq.toString(), parsed));
        }
        return messages;
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`IMAP check error for ${config.user}:`, message);
      return [];
    }
  }

  private parseMessage(id: string, parsed: ParsedMail): ReceiveMessage {
    const fromAddr = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
    const toAddr = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;
    return {
      id,
      from: (fromAddr as any)?.value?.[0]?.address || '',
      fromName: (fromAddr as any)?.value?.[0]?.name || '',
      to: (toAddr as any)?.value?.[0]?.address || '',
      subject: parsed.subject || '(No subject)',
      bodyHtml: parsed.html || '',
      bodyText: parsed.text || '',
      headers: parsed.headers ? this.headersToRecord(parsed.headers) : {},
      inReplyTo: parsed.inReplyTo || null,
      references: typeof parsed.references === 'string' ? parsed.references : null,
      attachments: (parsed.attachments || []).map((a) => ({
        filename: a.filename || 'attachment',
        content: Buffer.from(a.content as any || ''),
        contentType: a.contentType || 'application/octet-stream',
        size: a.size || 0,
      })),
      receivedAt: parsed.date || new Date(),
    };
  }

  private headersToRecord(headers: any): Record<string, string> {
    if (headers instanceof Map) {
      const rec: Record<string, string> = {};
      for (const [k, v] of headers) {
        rec[k] = String(v);
      }
      return rec;
    }
    return headers as Record<string, string>;
  }
}
