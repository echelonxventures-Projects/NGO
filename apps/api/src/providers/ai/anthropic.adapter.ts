import { Logger } from '@nestjs/common';
import { AiCompletionInput, AiCompletionResult, AiPort } from './ai.port';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  version: string;
}

/**
 * Adapter for Anthropic Claude (Messages API). Anthropic takes the system prompt as a
 * top-level `system` field and the rest as `messages` (user/assistant only). Uses the global
 * `fetch`; no SDK.
 */
export class AnthropicAdapter implements AiPort {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicAdapter.name);

  constructor(private readonly cfg: AnthropicConfig) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.cfg.apiKey) {
      throw new Error('anthropic provider selected but no API key configured');
    }
    const model = input.model ?? this.cfg.model;
    const system = input.messages.find((m) => m.role === 'system')?.content;
    const messages = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': this.cfg.version,
      },
      body: JSON.stringify({
        model,
        system,
        messages,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`anthropic error ${res.status}: ${body.slice(0, 300)}`);
      throw new Error(`anthropic request failed (${res.status})`);
    }

    const data = (await res.json()) as {
      content?: { text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      provider: this.name,
      model,
      text: data.content?.map((c) => c.text ?? '').join('') ?? '',
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
      },
    };
  }
}
