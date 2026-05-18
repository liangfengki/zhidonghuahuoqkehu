import type { VerificationResult, IEmailValidator } from '../types';

export class RapidEmailVerifier implements IEmailValidator {
  name = 'rapid-email-verifier';
  private baseUrl = process.env.RAPID_EMAIL_VERIFIER_URL || 'http://localhost:8000';

  async verify(email: string): Promise<VerificationResult> {
    try {
      const res = await fetch(`${this.baseUrl}/verify?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return {
        email, status: data.status || 'unknown',
        details: { formatValid: data.format_valid ?? true, mxExists: data.mx_exists ?? true, smtpValid: data.smtp_valid ?? null, disposable: data.disposable ?? false, freeProvider: data.free_provider ?? false, roleBased: data.role_based ?? false },
        provider: this.name,
      };
    } catch {
      return { email, status: 'unknown', details: { formatValid: true, mxExists: true, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name, error: 'Service unavailable' };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch { return false; }
  }
}
