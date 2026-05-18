import type { SendParams, SendResult, ChannelInfo } from './types';
import { ChannelRouter } from './channel-router';

export class EmailSender {
  private router = new ChannelRouter();

  async send(params: SendParams, channel: ChannelInfo): Promise<SendResult> {
    switch (channel.provider) {
      case 'brevo':
        return this.sendViaBrevo(params, channel);
      case 'resend':
        return this.sendViaResend(params, channel);
      case 'mailgun':
        return this.sendViaMailgun(params, channel);
      case 'mailjet':
        return this.sendViaMailjet(params, channel);
      default:
        return { success: false, channel: channel.provider, error: 'Unknown provider', sentAt: new Date() };
    }
  }

  private async sendViaBrevo(params: SendParams, channel: ChannelInfo): Promise<SendResult> {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': channel.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Sales Team', email: 'noreply@sales.example.com' },
          to: [{ email: params.to, name: params.toName }],
          subject: params.subject,
          htmlContent: params.htmlBody,
          headers: {
            'X-Campaign-Contact-Id': params.campaignContactId,
            'X-Tenant-Id': params.tenantId,
          },
          ...(params.trackingEnabled && {
            openTracking: true,
            clickTracking: true,
          }),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          messageId: data.messageId,
          channel: 'brevo',
          sentAt: new Date(),
        };
      }
      return { success: false, channel: 'brevo', error: data.message || 'Brevo API error', sentAt: new Date() };
    } catch (err: any) {
      return { success: false, channel: 'brevo', error: err.message, sentAt: new Date() };
    }
  }

  private async sendViaResend(params: SendParams, channel: ChannelInfo): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${channel.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sales Team <noreply@sales.example.com>',
          to: [`${params.toName} <${params.to}>`],
          subject: params.subject,
          html: params.htmlBody,
          headers: {
            'X-Campaign-Contact-Id': params.campaignContactId,
            'X-Tenant-Id': params.tenantId,
          },
          ...(params.trackingEnabled && {
            track_opens: true,
            track_clicks: true,
          }),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          messageId: data.id,
          channel: 'resend',
          sentAt: new Date(),
        };
      }
      return { success: false, channel: 'resend', error: data.message || 'Resend API error', sentAt: new Date() };
    } catch (err: any) {
      return { success: false, channel: 'resend', error: err.message, sentAt: new Date() };
    }
  }

  private async sendViaMailgun(params: SendParams, channel: ChannelInfo): Promise<SendResult> {
    try {
      const domain = channel.apiKey.includes(':') ? channel.apiKey.split(':')[0] : 'mg.example.com';
      const apiKey = channel.apiKey.includes(':') ? channel.apiKey.split(':')[1] : channel.apiKey;

      const form = new URLSearchParams();
      form.append('from', 'Sales Team <noreply@sales.example.com>');
      form.append('to', `${params.toName} <${params.to}>`);
      form.append('subject', params.subject);
      form.append('html', params.htmlBody);
      form.append('h:X-Campaign-Contact-Id', params.campaignContactId);
      form.append('h:X-Tenant-Id', params.tenantId);
      if (params.trackingEnabled) {
        form.append('o:tracking', 'yes');
        form.append('o:tracking-clicks', 'yes');
        form.append('o:tracking-opens', 'yes');
      }

      const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          messageId: data.id,
          channel: 'mailgun',
          sentAt: new Date(),
        };
      }
      return { success: false, channel: 'mailgun', error: data.message || 'Mailgun API error', sentAt: new Date() };
    } catch (err: any) {
      return { success: false, channel: 'mailgun', error: err.message, sentAt: new Date() };
    }
  }

  private async sendViaMailjet(params: SendParams, channel: ChannelInfo): Promise<SendResult> {
    try {
      const [apiKey, secretKey] = channel.apiKey.includes(':')
        ? channel.apiKey.split(':')
        : [channel.apiKey, ''];

      const res = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Messages: [{
            From: { Email: 'noreply@sales.example.com', Name: 'Sales Team' },
            To: [{ Email: params.to, Name: params.toName }],
            Subject: params.subject,
            HTMLPart: params.htmlBody,
            CustomID: params.campaignContactId,
            ...(params.trackingEnabled && {
              TrackOpens: 'enabled',
              TrackClicks: 'enabled',
            }),
          }],
        }),
      });

      const data = await res.json();
      if (res.ok && data.Messages?.[0]?.Status === 'success') {
        return {
          success: true,
          messageId: data.Messages[0].To[0]?.MessageID,
          channel: 'mailjet',
          sentAt: new Date(),
        };
      }
      return { success: false, channel: 'mailjet', error: data.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Mailjet API error', sentAt: new Date() };
    } catch (err: any) {
      return { success: false, channel: 'mailjet', error: err.message, sentAt: new Date() };
    }
  }

  selectChannelForSend(email: string, channels: ChannelInfo[]): ChannelInfo | null {
    return this.router.selectChannel(email, channels);
  }
}
