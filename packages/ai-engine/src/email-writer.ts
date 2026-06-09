import { AiClient, type AiConfig } from './client';

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  companyName?: string;
  industry?: string;
  country?: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export class EmailWriter {
  private client: AiClient;

  constructor(config: AiConfig) {
    this.client = new AiClient(config);
  }

  async generateEmail(contact: ContactInfo, productInfo?: string): Promise<GeneratedEmail> {
    const systemPrompt = `You are a professional B2B sales email writer. Write personalized, concise, and compelling cold outreach emails.

Rules:
- Write in the SAME language as the recipient's country (Chinese for China, English for US/UK, etc.)
- Keep the email under 150 words
- Be professional but friendly
- Include a clear call-to-action
- Do NOT use generic templates - make each email feel personal
- Reference the recipient's company/industry when possible
- Output ONLY a JSON object with "subject" and "body" fields
- The body should be plain HTML (simple <p> tags)`;

    const userPrompt = `Write a cold outreach email to:
- Name: ${contact.firstName} ${contact.lastName}
- Position: ${contact.position || 'Unknown'}
- Company: ${contact.companyName || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Country: ${contact.country || 'Unknown'}
${productInfo ? `- Our product/service: ${productInfo}` : ''}

Output format (JSON only):
{"subject": "...", "body": "..."}`;

    const res = await this.client.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.8 });

    try {
      const jsonMatch = res.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { subject: parsed.subject || 'Business Inquiry', body: parsed.body || res.content };
      }
    } catch {}

    return { subject: `Business Inquiry - ${contact.companyName || ''}`, body: res.content };
  }

  async generateBatch(contacts: ContactInfo[], productInfo?: string): Promise<Map<string, GeneratedEmail>> {
    const results = new Map<string, GeneratedEmail>();
    for (const contact of contacts) {
      try {
        const email = await this.generateEmail(contact, productInfo);
        results.set(contact.email, email);
        // Rate limit: wait between calls
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        console.error(`Failed to generate email for ${contact.email}:`, e.message);
      }
    }
    return results;
  }
}
