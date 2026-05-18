import type { VerificationResult, IEmailValidator } from '../types';

export class SniffmailVerifier implements IEmailValidator {
  name = 'sniffmail';
  private baseUrl = 'https://sniffmail.com/api/v1';

  async verify(email: string): Promise<VerificationResult> {
    try {
      const apiKey = process.env.SNIFFMAIL_API_KEY || '';
      const res = await fetch(`${this.baseUrl}/verify?email=${encodeURIComponent(email)}`, { headers: { 'X-Api-Key': apiKey } });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return {
        email, status: data.valid ? 'valid' : data.risky ? 'risky' : 'invalid',
        details: { formatValid: true, mxExists: data.mx_record ?? false, smtpValid: data.smtp_check ?? null, disposable: data.disposable ?? false, freeProvider: false, roleBased: false },
        provider: this.name,
      };
    } catch {
      return { email, status: 'unknown', details: { formatValid: true, mxExists: true, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name, error: 'Service unavailable' };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = process.env.SNIFFMAIL_API_KEY || '';
      if (!apiKey) return false;
      const res = await fetch(`${this.baseUrl}/credits`, { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      return (data.credits_remaining || 0) > 0;
    } catch { return false; }
  }
}
