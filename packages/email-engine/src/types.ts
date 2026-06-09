export interface ChannelInfo {
  provider: 'brevo' | 'resend' | 'mailgun' | 'mailjet' | 'smtp';
  apiKey: string;
  senderEmail?: string;
  senderName?: string;
  dailyLimit: number;
  dailySent: number;
  status: 'active' | 'paused' | 'exhausted';
  smtpConfig?: SmtpConfig;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

export interface SendParams {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  trackingEnabled: boolean;
  campaignContactId: string;
  tenantId: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  channel: string;
  error?: string;
  sentAt: Date;
}

export interface ReceiveMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  headers: Record<string, string>;
  attachments: Array<{ filename: string; content: Buffer; contentType: string; size: number }>;
  inReplyTo: string | null;
  references: string | null;
  receivedAt: Date;
}

export interface TrackingEvent {
  type: 'opened' | 'clicked' | 'bounced' | 'complained' | 'delivered';
  messageId: string;
  email: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}
