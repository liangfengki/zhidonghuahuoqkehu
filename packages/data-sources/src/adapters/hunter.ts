import type { IEmailFinder, ContactResult } from '../types';

export class HunterAdapter implements IEmailFinder {
  name = 'hunter';
  private baseUrl = 'https://api.hunter.io/v2';

  async findByDomain(domain: string, apiKey: string): Promise<ContactResult[]> {
    try {
      const url = `${this.baseUrl}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=50`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data?.emails || []).map((e: any) => ({
        firstName: e.first_name || '', lastName: e.last_name || '', email: e.value || '',
        position: e.position || null, linkedinUrl: e.linkedin || null,
        confidence: e.confidence ? e.confidence / 100 : 0.7, source: 'hunter', rawData: e,
      }));
    } catch { return []; }
  }

  async findByName(firstName: string, lastName: string, domain: string, apiKey: string): Promise<ContactResult | null> {
    try {
      const url = `${this.baseUrl}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.data) {
        return {
          firstName: data.data.first_name || firstName, lastName: data.data.last_name || lastName,
          email: data.data.email || '', position: data.data.position || null,
          linkedinUrl: data.data.linkedin || null,
          confidence: data.data.score ? data.data.score / 100 : 0.7, source: 'hunter', rawData: data.data,
        };
      }
      return null;
    } catch { return null; }
  }

  async getCredits(apiKey: string): Promise<{ remaining: number; limit: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/account?api_key=${apiKey}`);
      if (!res.ok) return { remaining: 0, limit: 50 };
      const data = await res.json();
      const calls = data.data?.calls?.used || 0;
      const limit = data.data?.calls?.available ?? 50;
      return { remaining: Math.max(0, limit - calls), limit };
    } catch { return { remaining: 0, limit: 50 }; }
  }
}
