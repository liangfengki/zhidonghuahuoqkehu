import type { ContactResult } from '../types';

/**
 * Free company search using multiple search engines.
 * No API key required - uses HTML scraping of search results.
 */
export class CompanySearchAdapter {
  name = 'company-search';

  async searchByKeywords(keywords: string, options?: { country?: string; industry?: string }): Promise<{ domain: string; name: string }[]> {
    const results: { domain: string; name: string }[] = [];
    const seen = new Set<string>();

    // Build search query
    const parts = [keywords];
    if (options?.industry) parts.push(options.industry);
    if (options?.country) parts.push(options.country);
    const query = parts.join(' ');

    // Try Bing search (more reliable than DuckDuckGo for company discovery)
    try {
      const bingResults = await this.searchBing(`${query} company website`);
      for (const r of bingResults) {
        if (!seen.has(r.domain)) { seen.add(r.domain); results.push(r); }
      }
    } catch {}

    // If not enough results, try DuckDuckGo
    if (results.length < 5) {
      try {
        const ddgResults = await this.searchDuckDuckGo(`${query} company contact email`);
        for (const r of ddgResults) {
          if (!seen.has(r.domain)) { seen.add(r.domain); results.push(r); }
        }
      } catch {}
    }

    return results;
  }

  private async searchBing(query: string): Promise<{ domain: string; name: string }[]> {
    const results: { domain: string; name: string }[] = [];
    try {
      const encoded = encodeURIComponent(query);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`https://www.bing.com/search?q=${encoded}&count=20`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const html = await res.text();

      // Extract URLs from Bing results
      const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.replace(/^www\./, '');
          // Filter out search engines, social media, and common sites
          if (this.isValidCompanyDomain(domain)) {
            results.push({ domain, name: this.domainToName(domain) });
          }
        } catch {}
      }
    } catch {}
    return results;
  }

  private async searchDuckDuckGo(query: string): Promise<{ domain: string; name: string }[]> {
    const results: { domain: string; name: string }[] = [];
    try {
      const encoded = encodeURIComponent(query);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const html = await res.text();

      const linkRegex = /href="(https?:\/\/[^"]+)"/g;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.replace(/^www\./, '');
          if (this.isValidCompanyDomain(domain)) {
            results.push({ domain, name: this.domainToName(domain) });
          }
        } catch {}
      }
    } catch {}
    return results;
  }

  private isValidCompanyDomain(domain: string): boolean {
    const skipDomains = [
      'duckduckgo.com', 'google.com', 'bing.com', 'yahoo.com', 'baidu.com',
      'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com',
      'wikipedia.org', 'reddit.com', 'quora.com', 'medium.com',
      'amazon.com', 'ebay.com', 'aliexpress.com', 'alibaba.com',
      'github.com', 'stackoverflow.com', 'npmjs.com',
      'yelp.com', 'glassdoor.com', 'indeed.com',
      'crunchbase.com', 'bloomberg.com', 'reuters.com',
    ];
    return !skipDomains.some(d => domain.includes(d)) && domain.includes('.') && domain.length > 4;
  }

  private domainToName(domain: string): string {
    return domain
      .replace(/\.(com|org|net|io|co|us|uk|de|fr|cn|jp|kr|in|au|ca|sg|hk)$/i, '')
      .replace(/[.-]/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
