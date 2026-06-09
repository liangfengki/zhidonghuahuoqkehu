import type { VerificationResult, IEmailValidator } from '../types';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'yopmail.com', 'throwaway.email', 'sharklasers.com', 'trashmail.com',
  'temp-mail.org', 'guerrillamailblock.com', 'grr.la', 'dispostable.com',
  'maildrop.cc', 'mailnesia.com', 'tempail.com', 'tempr.email',
  'tempmailo.com', 'mohmal.com', 'burnermail.io', 'inboxkitten.com',
  'fakeinbox.com', 'sharklasers.com', 'guerrillamail.info', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
]);
const ROLE_PARTS = new Set([
  'admin', 'info', 'sales', 'support', 'contact', 'hello', 'marketing',
  'hr', 'accounts', 'billing', 'office', 'enquiries', 'help', 'team',
  'jobs', 'careers', 'noreply', 'no-reply', 'postmaster', 'webmaster',
  'abuse', 'security', 'privacy', 'legal', 'compliance', 'feedback',
  'service', 'customerservice', 'customersuccess', 'press', 'media',
  'investor', 'ir', 'recruitment', 'talent', 'payroll', 'finance',
]);
const FREE_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'protonmail.com', 'aol.com', 'mail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'live.com', 'fastmail.com', 'tutanota.com',
  'qq.com', '163.com', '126.com', 'sina.com', 'foxmail.com',
  'naver.com', 'daum.net', 'hanmail.net', 'rediffmail.com',
  'mail.ru', 'bk.ru', 'list.ru', 'inbox.ru',
  'proton.me', 'pm.me', 'hey.com', 'startmail.com',
]);

export class EmailValidator {
  private validators: IEmailValidator[] = [];

  addValidator(validator: IEmailValidator): void { this.validators.push(validator); }

  async verify(email: string): Promise<VerificationResult> {
    const domain = email.split('@')[1];
    if (!this.formatCheck(email)) {
      return { email, status: 'invalid', details: { formatValid: false, mxExists: false, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: 'local' };
    }
    const disposable = DISPOSABLE_DOMAINS.has(domain?.toLowerCase() || '');
    const roleBased = ROLE_PARTS.has((email.split('@')[0] || '').toLowerCase());

    for (const v of this.validators) {
      try {
        if (!(await v.isAvailable())) continue;
        const result = await v.verify(email);
        if (result.status !== 'unknown') return { ...result, details: { ...result.details, disposable, roleBased } };
      } catch { }
    }
    return { email, status: 'unknown', details: { formatValid: true, mxExists: true, smtpValid: null, disposable, freeProvider: this.isFreeProvider(domain || ''), roleBased }, provider: 'local' };
  }

  private formatCheck(email: string): boolean {
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return re.test(email) && email.length <= 254;
  }

  private isFreeProvider(domain: string): boolean { return FREE_PROVIDERS.has(domain.toLowerCase()); }
}
