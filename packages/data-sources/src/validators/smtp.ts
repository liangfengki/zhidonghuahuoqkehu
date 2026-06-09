import type { VerificationResult, IEmailValidator } from '../types';
import { promises as dns } from 'dns';
import * as net from 'net';

export class SmtpVerifier implements IEmailValidator {
  name = 'smtp';

  async verify(email: string): Promise<VerificationResult> {
    const domain = email.split('@')[1];
    if (!domain) {
      return { email, status: 'invalid', details: { formatValid: false, mxExists: false, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    }

    // Step 1: Check MX records
    let mxExists = false;
    let mxHost = '';
    try {
      const records = await dns.resolveMx(domain);
      if (records.length > 0) {
        mxExists = true;
        mxHost = records.sort((a, b) => a.priority - b.priority)[0].exchange;
      }
    } catch {
      mxExists = false;
    }

    if (!mxExists) {
      return { email, status: 'invalid', details: { formatValid: true, mxExists: false, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    }

    // Step 2: Try SMTP handshake (RCPT TO verification)
    try {
      const smtpValid = await this.smtpVerify(mxHost, email);
      if (smtpValid) {
        return { email, status: 'valid', details: { formatValid: true, mxExists: true, smtpValid: true, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
      }
      // If SMTP verification fails or times out, return risky
      return { email, status: 'risky', details: { formatValid: true, mxExists: true, smtpValid: false, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    } catch (err: any) {
      // SMTP connection failed or timed out
      return { email, status: 'risky', details: { formatValid: true, mxExists: true, smtpValid: null, disposable: false, freeProvider: false, roleBased: false }, provider: this.name };
    }
  }

  private async smtpVerify(mxHost: string, email: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let buffer = '';
      let step = 0;
      let resolved = false;

      const done = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          try { socket.destroy(); } catch {}
          resolve(result);
        }
      };

      socket.setTimeout(10000); // 10 second timeout

      socket.on('timeout', () => done(false));
      socket.on('error', () => done(false));
      socket.on('close', () => done(false));

      socket.on('data', (data) => {
        buffer += data.toString();
        
        // Process line by line
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (step === 0 && line.startsWith('220')) {
            // Server ready, send HELO
            socket.write(`HELO verify.example.com\r\n`);
            step = 1;
          } else if (step === 1 && line.startsWith('250')) {
            // HELO accepted, send MAIL FROM
            socket.write(`MAIL FROM:<verify@example.com>\r\n`);
            step = 2;
          } else if (step === 2 && line.startsWith('250')) {
            // MAIL FROM accepted, send RCPT TO
            socket.write(`RCPT TO:<${email}>\r\n`);
            step = 3;
          } else if (step === 3) {
            // RCPT TO response
            if (line.startsWith('250')) {
              // Email exists, send QUIT
              socket.write(`QUIT\r\n`);
              done(true);
            } else if (line.startsWith('550') || line.startsWith('551') || line.startsWith('552') || line.startsWith('553')) {
              // Email doesn't exist
              socket.write(`QUIT\r\n`);
              done(false);
            } else {
              // Other response, treat as risky
              socket.write(`QUIT\r\n`);
              done(false);
            }
          }
        }
      });

      socket.connect(25, mxHost);

      // Fallback timeout
      setTimeout(() => done(false), 10000);
    });
  }

  async isAvailable(): Promise<boolean> { return true; }
}
