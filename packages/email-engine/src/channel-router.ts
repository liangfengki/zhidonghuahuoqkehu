import type { ChannelInfo } from './types';

export class ChannelRouter {
  private domainPriority: Record<string, string[]> = {
    'gmail.com': ['brevo', 'resend', 'mailgun', 'mailjet'],
    'googlemail.com': ['brevo', 'resend', 'mailgun', 'mailjet'],
    'outlook.com': ['resend', 'mailgun', 'brevo', 'mailjet'],
    'hotmail.com': ['resend', 'mailgun', 'brevo', 'mailjet'],
    'yahoo.com': ['mailgun', 'brevo', 'resend', 'mailjet'],
    'icloud.com': ['mailjet', 'resend', 'mailgun', 'brevo'],
  };

  selectChannel(email: string, channels: ChannelInfo[]): ChannelInfo | null {
    const activeChannels = channels.filter(c => c.status === 'active' && c.dailySent < c.dailyLimit);
    if (activeChannels.length === 0) return null;

    const domain = email.split('@')[1]?.toLowerCase() || 'unknown';
    const priorities = this.domainPriority[domain] || ['brevo', 'resend', 'mailgun', 'mailjet'];

    for (const provider of priorities) {
      const channel = activeChannels.find(c => c.provider === provider);
      if (channel) return channel;
    }

    return activeChannels[0];
  }

  getAllDomains(): string[] {
    return Object.keys(this.domainPriority);
  }
}
