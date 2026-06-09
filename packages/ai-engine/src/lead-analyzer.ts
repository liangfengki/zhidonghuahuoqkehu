import { AiClient, type AiConfig } from './client';

export interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  companyName?: string;
  industry?: string;
  country?: string;
  website?: string;
}

export interface LeadAnalysis {
  score: number;        // 0-100
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedApproach: string;
}

export class LeadAnalyzer {
  private client: AiClient;

  constructor(config: AiConfig) {
    this.client = new AiClient(config);
  }

  async analyzeLead(lead: LeadData): Promise<LeadAnalysis> {
    const prompt = `Analyze this B2B lead and score its potential (0-100):

- Name: ${lead.firstName} ${lead.lastName}
- Position: ${lead.position || 'Unknown'}
- Company: ${lead.companyName || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Country: ${lead.country || 'Unknown'}
- Email: ${lead.email}

Respond in JSON:
{"score": 0-100, "priority": "high|medium|low", "reason": "...", "suggestedApproach": "..."}`;

    const res = await this.client.chat([
      { role: 'system', content: 'You are a B2B sales analyst. Analyze leads and provide scoring. Be concise. Output JSON only.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    try {
      const jsonMatch = res.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
          priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
          reason: parsed.reason || '',
          suggestedApproach: parsed.suggestedApproach || '',
        };
      }
    } catch {}

    return { score: 50, priority: 'medium', reason: 'Unable to analyze', suggestedApproach: 'Standard outreach' };
  }

  async analyzeBatch(leads: LeadData[]): Promise<Map<string, LeadAnalysis>> {
    const results = new Map<string, LeadAnalysis>();
    for (const lead of leads) {
      try {
        const analysis = await this.analyzeLead(lead);
        results.set(lead.email, analysis);
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        console.error(`Failed to analyze ${lead.email}:`, e.message);
      }
    }
    return results;
  }
}
