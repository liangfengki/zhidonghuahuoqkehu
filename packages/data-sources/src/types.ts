export interface ContactResult {
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  linkedinUrl: string | null;
  confidence: number;
  source: string;
  rawData?: Record<string, unknown>;
}

export interface VerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  details: {
    formatValid: boolean;
    mxExists: boolean;
    smtpValid: boolean | null;
    disposable: boolean;
    freeProvider: boolean;
    roleBased: boolean;
  };
  provider: string;
  error?: string;
}

export interface EmailPattern {
  domain: string;
  pattern: string;
  confidence: number;
  examples: string[];
}

export interface IEmailFinder {
  name: string;
  findByDomain(domain: string, apiKey: string): Promise<ContactResult[]>;
  findByName(firstName: string, lastName: string, domain: string, apiKey: string): Promise<ContactResult | null>;
  getCredits(apiKey: string): Promise<{ remaining: number; limit: number }>;
}

export interface IEmailValidator {
  name: string;
  verify(email: string): Promise<VerificationResult>;
  isAvailable(): Promise<boolean>;
}
