import { AiClient, AiConfig } from './client';

export interface ProductExtraction {
  keywords: string;
  industry: string;
  country: string;
}

export class ProductExtractor {
  private client: AiClient;

  constructor(config: AiConfig) {
    this.client = new AiClient(config);
  }

  async extract(description: string): Promise<ProductExtraction> {
    try {
      const { content } = await this.client.chat(
        [
          {
            role: 'system',
            content: `You are a B2B market analyst. Analyze a product/service description and extract targeting parameters for lead generation.
Output ONLY valid JSON with these fields:
- keywords: comma-separated search terms in BOTH Chinese and English (e.g. "打印机, printer, UV printing machine")
- industry: the target industry in English
- country: target markets/countries in English, comma-separated

IMPORTANT: Always include both Chinese and English keywords for better search results.`,
          },
          {
            role: 'user',
            content: `Product/Service: ${description}`,
          },
        ],
        { temperature: 0.3, maxTokens: 500 },
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        keywords: String(parsed.keywords || ''),
        industry: String(parsed.industry || ''),
        country: String(parsed.country || ''),
      };
    } catch (err) {
      // Fallback: extract basic keywords and add English translations
      const words = description
        .replace(/[，。、；：！？""''（）\[\]【】]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 2)
        .slice(0, 5);

      // Simple translation map for common terms
      const translations: Record<string, string> = {
        '打印机': 'printer', '喷墨': 'inkjet', '数码': 'digital',
        '工业': 'industrial', '自动化': 'automation', '设备': 'equipment',
        '机器': 'machine', '机械': 'machinery', '电子': 'electronics',
        '汽车': 'automotive', '食品': 'food', '服装': 'clothing',
        '源头工厂': 'manufacturer', '工厂': 'factory',
        'UV': 'UV printer', 'DTF': 'DTF printer', '水晶标': 'crystal label',
      };

      const englishWords: string[] = [];
      for (const w of words) {
        if (translations[w]) englishWords.push(translations[w]);
      }

      const allKeywords = [...words, ...englishWords].join(', ');
      return {
        keywords: allKeywords,
        industry: '',
        country: '',
      };
    }
  }
}
