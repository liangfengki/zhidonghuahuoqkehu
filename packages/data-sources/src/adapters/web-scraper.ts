import type { ContactResult } from '../types';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SKIP_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|ttf|pdf|zip|exe)$/i;

export class WebScraperAdapter {
  name = 'web-scraper';

  async findByDomain(domain: string): Promise<ContactResult[]> {
    const emails = new Set<string>();

    // 1. Try common contact/about pages
    const pages = [
      `https://${domain}`,
      `https://www.${domain}`,
      `https://${domain}/contact`,
      `https://${domain}/about`,
      `https://${domain}/contact-us`,
      `https://${domain}/about-us`,
      `https://${domain}/team`,
      `https://${domain}/impressum`,
    ];

    for (const url of pages) {
      try {
        const found = await this.scrapeEmails(url, domain);
        found.forEach(e => emails.add(e));
      } catch {}
    }

    // 2. If no emails found, try DuckDuckGo search
    if (emails.size === 0) {
      try {
        const searchEmails = await this.searchDuckDuckGo(domain);
        searchEmails.forEach(e => emails.add(e));
      } catch {}
    }

    // 3. Try DNS MX-based inference
    if (emails.size === 0) {
      try {
        const mxEmails = await this.checkDnsRecords(domain);
        mxEmails.forEach(e => emails.add(e));
      } catch {}
    }

    return Array.from(emails).map(email => ({
      firstName: this.extractFirstName(email),
      lastName: this.extractLastName(email),
      email,
      position: null,
      linkedinUrl: null,
      confidence: 0.4,
      source: this.name,
    }));
  }

  async findByUrl(url: string): Promise<ContactResult[]> {
    const emails = new Set<string>();
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      return [];
    }

    try {
      const found = await this.scrapeEmails(url, domain);
      found.forEach(e => emails.add(e));
    } catch {}

    return Array.from(emails).map(email => ({
      firstName: this.extractFirstName(email),
      lastName: this.extractLastName(email),
      email,
      position: null,
      linkedinUrl: null,
      confidence: 0.5,
      source: this.name,
    }));
  }

  private async scrapeEmails(url: string, domain: string): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; B2BLeadGen/1.0)' },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return [];

      const html = await res.text();
      return this.extractEmailsFromHtml(html, domain);
    } catch {
      return [];
    }
  }

  private extractEmailsFromHtml(html: string, domain: string): string[] {
    const emails: string[] = [];

    // Extract from mailto: links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
      emails.push(match[1].toLowerCase());
    }

    // Extract from text content
    const textEmails = html.match(EMAIL_REGEX) || [];
    for (const email of textEmails) {
      const lower = email.toLowerCase();
      // Filter out image/resource URLs and common false positives
      if (SKIP_EXTENSIONS.test(lower)) continue;
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')) continue;
      if (lower.includes('example.com') || lower.includes('test.com') || lower.includes('sentry.io')) continue;
      if (lower.includes('webpack') || lower.includes('github.com') || lower.includes('w3.org')) continue;
      if (lower.includes('schema.org') || lower.includes('googleapis.com')) continue;
      emails.push(lower);
    }

    // Deduplicate and filter to target domain or business emails
    const unique = [...new Set(emails)];
    return unique.filter(e => {
      const eDomain = e.split('@')[1];
      // Prefer emails from the same domain
      if (eDomain === domain || eDomain === `www.${domain}`) return true;
      // Also accept business-looking emails (not free providers)
      if (!this.isFreeProvider(eDomain)) return true;
      return false;
    });
  }

  private async searchDuckDuckGo(domain: string): Promise<string[]> {
    try {
      const query = encodeURIComponent(`"@${domain}" email contact`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const html = await res.text();
      return this.extractEmailsFromHtml(html, domain);
    } catch {
      return [];
    }
  }

  private async checkDnsRecords(domain: string): Promise<string[]> {
    const emails: string[] = [];
    // Common admin email patterns for the domain
    const commonNames = [
      'info', 'contact', 'hello', 'sales', 'marketing', 'support',
      'admin', 'office', 'enquiry', 'enquiries', 'business',
    ];
    // We can't verify without SMTP, so just generate common patterns
    // These will be verified later by the verification pipeline
    return emails;
  }

  private extractFirstName(email: string): string {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
  }

  private extractLastName(email: string): string {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    return parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
  }

  private isFreeProvider(domain: string): boolean {
    const freeProviders = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
      'protonmail.com', 'aol.com', 'mail.com', 'zoho.com', 'yandex.com',
      'gmx.com', 'live.com', 'fastmail.com', 'tutanota.com', 'qq.com',
      '163.com', '126.com', 'sina.com', 'foxmail.com',
    ]);
    return freeProviders.has(domain.toLowerCase());
  }
}
