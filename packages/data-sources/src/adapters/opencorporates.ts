import type { ContactResult } from '../types';

export interface CompanyResult {
  name: string;
  domain: string;
  industry: string;
  country: string;
  jurisdiction: string;
  companyNumber: string;
  status: string;
  website?: string;
}

/**
 * OpenCorporates adapter - free API, no key needed for basic searches.
 * Searches 200M+ company records by name, industry, jurisdiction.
 * https://api.opencorporates.com/documentation/API-Reference
 */
export class OpenCorporatesAdapter {
  name = 'opencorporates';
  private baseUrl = 'https://api.opencorporates.com/v0.4';

  async searchCompanies(query: string, options?: { country?: string; industry?: string }): Promise<CompanyResult[]> {
    try {
      const params = new URLSearchParams({ q: query, per_page: '20' });
      if (options?.country) {
        const jurisdiction = this.countryToJurisdiction(options.country);
        if (jurisdiction) params.set('jurisdiction_code', jurisdiction);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${this.baseUrl}/companies/search?${params}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const data = await res.json();
      const companies = data.results?.companies || [];

      return companies
        .map((c: any) => {
          const company = c.company;
          const domain = this.extractDomain(company);
          if (!domain) return null;
          return {
            name: company.name || '',
            domain,
            industry: company.industry || options?.industry || '',
            country: company.jurisdiction_code?.split('/')[0] || options?.country || '',
            jurisdiction: company.jurisdiction_code || '',
            companyNumber: company.company_number || '',
            status: company.current_status || '',
            website: company.website || '',
          };
        })
        .filter((c: CompanyResult | null): c is CompanyResult => c !== null);
    } catch {
      return [];
    }
  }

  async findByIndustry(industry: string, country?: string): Promise<CompanyResult[]> {
    // Search by industry keywords
    return this.searchCompanies(industry, { country });
  }

  extractDomain(company: any): string | null {
    // Try to get domain from company website or registered address
    if (company.website) {
      try {
        const url = company.website.startsWith('http') ? company.website : `https://${company.website}`;
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {}
    }
    // Try to infer domain from company name
    const name = (company.name || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .trim();
    if (name.length >= 3 && name.length <= 30) {
      return `${name}.com`;
    }
    return null;
  }

  private countryToJurisdiction(country: string): string | null {
    const map: Record<string, string> = {
      'us': 'us', 'usa': 'us', 'united states': 'us',
      'uk': 'gb', 'united kingdom': 'gb', 'great britain': 'gb',
      'de': 'de', 'germany': 'de',
      'fr': 'fr', 'france': 'fr',
      'cn': 'cn', 'china': 'cn',
      'jp': 'jp', 'japan': 'jp',
      'kr': 'kr', 'south korea': 'kr', 'korea': 'kr',
      'in': 'in', 'india': 'in',
      'au': 'au', 'australia': 'au',
      'ca': 'ca', 'canada': 'ca',
      'sg': 'sg', 'singapore': 'sg',
      'hk': 'hk', 'hong kong': 'hk',
      'tw': 'tw', 'taiwan': 'tw',
      'my': 'my', 'malaysia': 'my',
      'th': 'th', 'thailand': 'th',
      'vn': 'vn', 'vietnam': 'vn',
      'id': 'id', 'indonesia': 'id',
      'ph': 'ph', 'philippines': 'ph',
      'br': 'br', 'brazil': 'br',
      'mx': 'mx', 'mexico': 'mx',
      'ae': 'ae', 'uae': 'ae', 'dubai': 'ae',
      'sa': 'sa', 'saudi arabia': 'sa',
      'nl': 'nl', 'netherlands': 'nl',
      'it': 'it', 'italy': 'it',
      'es': 'es', 'spain': 'es',
    };
    const lower = country.toLowerCase().trim();
    return map[lower] || null;
  }
}
