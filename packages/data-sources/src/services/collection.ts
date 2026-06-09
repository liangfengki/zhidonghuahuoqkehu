import type { IEmailFinder, ContactResult } from '../types';
import { ApolloAdapter } from '../adapters/apollo';
import { HunterAdapter } from '../adapters/hunter';
import { WebScraperAdapter } from '../adapters/web-scraper';
import { CompanySearchAdapter } from '../adapters/company-search';
import { EmailPatternFinder } from '../adapters/pattern-finder';
import { OpenCorporatesAdapter } from '../adapters/opencorporates';

export interface CollectionConfig { apolloApiKey?: string; hunterApiKey?: string; }
export interface CollectionResult { domain: string; contacts: ContactResult[]; pattern: string | null; source: string; }

export class LeadCollectionService {
  private finders: Map<string, IEmailFinder> = new Map();
  private webScraper = new WebScraperAdapter();
  private companySearch = new CompanySearchAdapter();
  private patternFinder = new EmailPatternFinder();
  private openCorporates = new OpenCorporatesAdapter();

  constructor() {
    this.finders.set('apollo', new ApolloAdapter());
    this.finders.set('hunter', new HunterAdapter());
  }

  async collectFromDomain(domain: string, config: CollectionConfig, knownEmails?: string[]): Promise<CollectionResult> {
    const contacts: ContactResult[] = [];

    // 1. Try Apollo (if key provided)
    if (config.apolloApiKey) {
      try {
        const f = this.finders.get('apollo')!;
        const credits = await f.getCredits(config.apolloApiKey);
        if (credits.remaining > 0) contacts.push(...(await f.findByDomain(domain, config.apolloApiKey)));
      } catch {}
    }

    // 2. Try Hunter (if key provided and Apollo returned nothing)
    if (config.hunterApiKey && contacts.length === 0) {
      try {
        const f = this.finders.get('hunter')!;
        const credits = await f.getCredits(config.hunterApiKey);
        if (credits.remaining > 0) contacts.push(...(await f.findByDomain(domain, config.hunterApiKey)));
      } catch {}
    }

    // 3. Try web scraping (always available, no key needed)
    if (contacts.length === 0) {
      try {
        const scraped = await this.webScraper.findByDomain(domain);
        contacts.push(...scraped);
      } catch {}
    }

    // 4. Try OpenCorporates to find company info and domain
    if (contacts.length === 0) {
      try {
        const companies = await this.openCorporates.searchCompanies(domain);
        if (companies.length > 0) {
          const company = companies[0];
          if (company.website) {
            const companyDomain = this.openCorporates.extractDomain(company.website);
            if (companyDomain && companyDomain !== domain) {
              const scraped = await this.webScraper.findByDomain(companyDomain);
              contacts.push(...scraped);
            }
          }
        }
      } catch {}
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
    const results: CollectionResult[] = [];
    for (const domain of domains) {
      results.push(await this.collectFromDomain(domain, config));
      await new Promise(r => setTimeout(r, 1000));
    }
    return results;
  }

  async collectByKeywords(keywords: string, config: CollectionConfig, options?: { industry?: string; country?: string }): Promise<ContactResult[]> {
    const contacts: ContactResult[] = [];
    const seenEmails = new Set<string>();

    // 1. Try Apollo (if key provided)
    if (config.apolloApiKey) {
      try {
        const apollo = this.finders.get('apollo')!;
        const apolloContacts = await (apollo as any).findByKeywords(keywords, config.apolloApiKey, options);
        for (const c of apolloContacts) {
          if (c.email && !seenEmails.has(c.email)) { seenEmails.add(c.email); contacts.push(c); }
        }
      } catch {}
    }

    // 2. Try Hunter (if key provided and Apollo returned nothing)
    if (config.hunterApiKey && contacts.length === 0) {
      try {
        const hunter = this.finders.get('hunter')!;
        const hunterContacts = await (hunter as any).findByKeywords(keywords, config.hunterApiKey, options);
        for (const c of hunterContacts) {
          if (c.email && !seenEmails.has(c.email)) { seenEmails.add(c.email); contacts.push(c); }
        }
      } catch {}
    }

    // 3. Try OpenCorporates for company search (free, no API key needed)
    if (contacts.length < 10) {
      try {
        const companies = await this.openCorporates.searchCompanies(keywords, { country: options?.country });
        for (const company of companies.slice(0, 5)) {
          if (company.website) {
            const domain = this.openCorporates.extractDomain(company.website);
            if (domain) {
              try {
                const scraped = await this.webScraper.findByDomain(domain);
                for (const c of scraped) {
                  if (c.email && !seenEmails.has(c.email)) {
                    seenEmails.add(c.email);
                    contacts.push({ ...c, source: 'opencorporates' });
                  }
                }
                await new Promise(r => setTimeout(r, 600));
              } catch {}
            }
          }
        }
      } catch {}
    }

    // 4. Free search: find companies via search engines, then scrape for emails
    if (contacts.length < 10) {
      try {
        // Build multiple search queries - mix Chinese keywords with English for better results
        const queries = [keywords];
        if (options?.industry) queries.push(options.industry);

        // Also add English equivalents for common Chinese terms
        const englishKeywords = this.translateToEnglish(keywords);
        if (englishKeywords !== keywords) queries.push(englishKeywords);

        const allCompanies: { domain: string; name: string }[] = [];
        const seenDomains = new Set<string>();

        for (const q of queries) {
          if (allCompanies.length >= 15) break;
          try {
            const companies = await this.companySearch.searchByKeywords(q, { country: options?.country });
            console.log(`[CompanySearch] Query "${q}" → ${companies.length} companies`);
            for (const c of companies) {
              if (!seenDomains.has(c.domain)) {
                seenDomains.add(c.domain);
                allCompanies.push(c);
              }
            }
          } catch {}
        }

        for (const company of allCompanies.slice(0, 10)) {
          if (contacts.length >= 20) break;
          try {
            const scraped = await this.webScraper.findByDomain(company.domain);
            for (const c of scraped) {
              if (c.email && !seenEmails.has(c.email)) {
                seenEmails.add(c.email);
                contacts.push({ ...c, source: 'web-scraper' });
              }
            }
            await new Promise(r => setTimeout(r, 600));
          } catch {}
        }
      } catch (e: any) {
        console.error('[CompanySearch] Error:', e.message);
      }
    }

    return contacts;
  }

  private translateToEnglish(keywords: string): string {
    const translations: Record<string, string> = {
      '打印机': 'printer', '打印': 'printing', '喷墨': 'inkjet',
      '数码': 'digital', '工业': 'industrial', '自动化': 'automation',
      '设备': 'equipment', '机器': 'machine', '机械': 'machinery',
      '电子': 'electronics', '配件': 'parts', '零部件': 'components',
      '材料': 'materials', '原材料': 'raw materials', '包装': 'packaging',
      '食品': 'food', '服装': 'clothing', '家具': 'furniture',
      '玩具': 'toys', '五金': 'hardware', '工具': 'tools',
      '化工': 'chemical', '塑料': 'plastic', '橡胶': 'rubber',
      '金属': 'metal', '钢铁': 'steel', '铝': 'aluminum',
      '纺织': 'textile', '面料': 'fabric', '皮革': 'leather',
      '汽车': 'automotive', '轮胎': 'tire',
      '建材': 'building materials', '陶瓷': 'ceramic', '玻璃': 'glass',
      '医疗': 'medical', '保健': 'health', '美容': 'beauty',
      '化妆品': 'cosmetics', '珠宝': 'jewelry', '手表': 'watches',
      '照明': 'lighting', '灯具': 'lamp', 'LED': 'LED',
      '太阳能': 'solar', '电池': 'battery', '充电': 'charging',
      '源头工厂': 'manufacturer', '工厂': 'factory', '制造商': 'manufacturer',
      '出口': 'export', '进口': 'import', '贸易': 'trading',
      '批发': 'wholesale', '供应商': 'supplier',
      'UV': 'UV', 'DTF': 'DTF', '水晶标': 'crystal label',
    };

    let result = keywords;
    for (const [cn, en] of Object.entries(translations)) {
      result = result.replace(new RegExp(cn, 'g'), en);
    }
    return result;
  }
}
