export interface AiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class AiClient {
  constructor(private config: AiConfig) {}

  async chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI API error ${res.status}: ${err}`);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
