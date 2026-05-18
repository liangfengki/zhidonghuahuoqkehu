import type { IEmailFinder, ContactResult } from '../types';

export class ApolloAdapter implements IEmailFinder {
  name = 'apollo';
  private baseUrl = 'https://api.apollo.io/api/v1';

  async findByDomain(domain: string, apiKey: string): Promise<ContactResult[]> {
    try {
      const url = new URL(`${this.baseUrl}/contacts/search`);
      url.searchParams.set('q_organization_domains[]', domain);
      url.searchParams.set('per_page', '50');

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apiKey },
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.contacts || []).map((c: any) => ({
        firstName: c.first_name || '', lastName: c.last_name || '', email: c.email || '',
        position: c.title || null, linkedinUrl: c.linkedin_url || null,
        confidence: c.email ? 0.8 : 0.3, source: 'apollo', rawData: c,
      }));
    } catch { return []; }
  }

  async findByName(firstName: string, lastName: string, domain: string, apiKey: string): Promise<ContactResult | null> {
    const contacts = await this.findByDomain(domain, apiKey);
    return contacts.find(c => c.firstName.toLowerCase() === firstName.toLowerCase() && c.lastName.toLowerCase() === lastName.toLowerCase()) || null;
  }

  async getCredits(apiKey: string): Promise<{ remaining: number; limit: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/health`, { headers: { 'X-Api-Key': apiKey } });
      if (!res.ok) return { remaining: 0, limit: 50 };
      const data = await res.json();
      return { remaining: data.credits?.remaining ?? 0, limit: data.credits?.limit ?? 50 };
    } catch { return { remaining: 0, limit: 50 }; }
  }
}
