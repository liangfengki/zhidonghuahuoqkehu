import type { IEmailFinder, ContactResult } from '../types';
import { ApolloAdapter } from '../adapters/apollo';
import { HunterAdapter } from '../adapters/hunter';
import { EmailPatternFinder } from '../adapters/pattern-finder';

export interface CollectionConfig { apolloApiKey?: string; hunterApiKey?: string; }
export interface CollectionResult { domain: string; contacts: ContactResult[]; pattern: string | null; source: string; }

export class LeadCollectionService {
  private finders: Map<string, IEmailFinder> = new Map();
  private patternFinder = new EmailPatternFinder();

  constructor() {
    this.finders.set('apollo', new ApolloAdapter());
    this.finders.set('hunter', new HunterAdapter());
  }

  async collectFromDomain(domain: string, config: CollectionConfig, knownEmails?: string[]): Promise<CollectionResult> {
    const contacts: ContactResult[] = [];
    if (config.apolloApiKey) {
      const f = this.finders.get('apollo')!;
      const credits = await f.getCredits(config.apolloApiKey);
      if (credits.remaining > 0) contacts.push(...(await f.findByDomain(domain, config.apolloApiKey)));
    }
    if (config.hunterApiKey && contacts.length === 0) {
      const f = this.finders.get('hunter')!;
      const credits = await f.getCredits(config.hunterApiKey);
      if (credits.remaining > 0) contacts.push(...(await f.findByDomain(domain, config.hunterApiKey)));
    }
    if (contacts.length === 0) {
      const pattern = await this.patternFinder.findPattern(domain, knownEmails);
      return { domain, contacts: [], pattern: pattern?.pattern || '{first}.{last}', source: 'pattern' };
    }
    const emails = contacts.filter(c => c.email).map(c => c.email);
    const pattern = await this.patternFinder.findPattern(domain, emails);
    return { domain, contacts, pattern: pattern?.pattern || '{first}.{last}', source: contacts[0]?.source || 'unknown' };
  }

  async collectFromDomains(domains: string[], config: CollectionConfig): Promise<CollectionResult[]> {
    return Promise.all(domains.map(d => this.collectFromDomain(d, config)));
  }
}
