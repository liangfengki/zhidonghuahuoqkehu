import type { VerificationResult, IEmailValidator } from '../types';
import { promises as dns } from 'dns';

export class SmtpVerifier implements IEmailValidator {
  name = 'smtp';

  async verify(email: string): Promise<VerificationResult> {
    const domain = email.split('@')[1];
    if (!domain) {
      return { email, status: 'invalid', details: { formatValid: false, mxExists: false, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    }
    let mxExists = false;
    try { const records = await dns.resolveMx(domain); mxExists = records.length > 0; } catch { mxExists = false; }
    if (!mxExists) {
      return { email, status: 'invalid', details: { formatValid: true, mxExists: false, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    }
    return { email, status: 'risky', details: { formatValid: true, mxExists: true, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
  }

  async isAvailable(): Promise<boolean> { return true; }
}
