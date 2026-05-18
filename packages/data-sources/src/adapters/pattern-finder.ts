import type { EmailPattern } from '../types';

const COMMON_PATTERNS = [
  '{first}.{last}', '{f}{last}', '{first}.{l}', '{first}{last}',
  '{first}_{last}', '{first}-{last}', '{last}', '{first}', '{f}{l}',
];

export class EmailPatternFinder {
  generateCandidates(firstName: string, lastName: string, domain: string): string[] {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const f = first[0] || '';
    const l = last[0] || '';
    return COMMON_PATTERNS.map(pattern => {
      const email = pattern.replace('{first}', first).replace('{last}', last).replace('{f}', f).replace('{l}', l);
      return `${email}@${domain}`;
    });
  }

  async findPattern(domain: string, knownEmails?: string[]): Promise<EmailPattern | null> {
    if (knownEmails && knownEmails.length > 0) {
      const pattern = this.inferPattern(knownEmails);
      if (pattern) return pattern;
    }
    for (const patternStr of COMMON_PATTERNS) {
      try {
        const testEmail = `${patternStr.replace('{first}','john').replace('{last}','doe').replace('{f}','j').replace('{l}','d')}`;
        const exists = await this.checkGitHubPattern(testEmail, domain);
        if (exists) return { domain, pattern: patternStr, confidence: 0.6, examples: [] };
      } catch { }
    }
    return { domain, pattern: '{first}.{last}', confidence: 0.3, examples: [] };
  }

  private inferPattern(emails: string[]): EmailPattern | null {
    if (emails.length === 0) return null;
    const domain = emails[0].split('@')[1];
    for (const pattern of COMMON_PATTERNS) {
      let matchCount = 0;
      for (const email of emails) {
        if (this.matchesPattern(email.split('@')[0], pattern)) matchCount++;
      }
      if (matchCount === emails.length) return { domain, pattern, confidence: 0.7, examples: emails };
    }
    return null;
  }

  private matchesPattern(localPart: string, pattern: string): boolean {
    const regex = pattern
      .replace('{first}', '[a-z]+').replace('{last}', '[a-z]+')
      .replace('{f}', '[a-z]').replace('{l}', '[a-z]')
      .replace(/\./g, '\\.').replace(/_/g, '\\_').replace(/-/g, '\\-');
    return new RegExp(`^${regex}$`).test(localPart);
  }

  private async checkGitHubPattern(_localPart: string, domain: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.github.com/search/commits?q=${encodeURIComponent(domain)}+author-email&per_page=1`, {
        headers: { Accept: 'application/vnd.github.cloak-preview+json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return (data.total_count || 0) > 0;
    } catch { return false; }
  }
}
