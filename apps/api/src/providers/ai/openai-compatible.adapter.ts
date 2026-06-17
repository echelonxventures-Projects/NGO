import { Logger } from '@nestjs/common';
import { AiCompletionInput, AiCompletionResult, AiPort } from './ai.port';

export interface OpenAiCompatibleConfig {
  /** Logical provider name (openai | openrouter | deepseek | mistral). */
  name: string;
  /** API base, e.g. https://api.openai.com/v1 or https://openrouter.ai/api/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Adapter for any provider exposing the OpenAI Chat Completions API shape. A single class
 * serves OpenAI, OpenRouter, DeepSeek and Mistral — only the base URL, key and default model
 * differ (supplied by the module factory). Uses the global `fetch` (Node 20+); no SDK.
 */
export class OpenAiCompatibleAdapter implements AiPort {
  readonly name: string;
  private readonly logger = new Logger(OpenAiCompatibleAdapter.name);

  constructor(private readonly cfg: OpenAiCompatibleConfig) {
    this.name = cfg.name;
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.cfg.apiKey) {
      throw new Error(`${this.name} provider selected but no API key configured`);
    }
    const model = input.model ?? this.cfg.model;
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`${this.name} error ${res.status}: ${body.slice(0, 300)}`);
      throw new Error(`${this.name} request failed (${res.status})`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      provider: this.name,
      model,
      text: data.choices?.[0]?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }
}
