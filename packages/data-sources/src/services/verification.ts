import { EmailValidator } from '../validators/validator';
import { RapidEmailVerifier } from '../validators/rapid';
import { SniffmailVerifier } from '../validators/sniffmail';
import { SmtpVerifier } from '../validators/smtp';
import type { VerificationResult } from '../types';

export class VerificationService {
  private validator: EmailValidator;
  constructor() {
    this.validator = new EmailValidator();
    this.validator.addValidator(new RapidEmailVerifier());
    this.validator.addValidator(new SniffmailVerifier());
    this.validator.addValidator(new SmtpVerifier());
  }
  async verify(email: string): Promise<VerificationResult> { return this.validator.verify(email); }
  async verifyBatch(emails: string[]): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    for (let i = 0; i < emails.length; i += 5) {
      results.push(...(await Promise.all(emails.slice(i, i + 5).map(e => this.verify(e)))));
      if (i + 5 < emails.length) await new Promise(r => setTimeout(r, 100));
    }
    return results;
  }
}
