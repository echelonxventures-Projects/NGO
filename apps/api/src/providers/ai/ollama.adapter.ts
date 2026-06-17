import { Logger } from '@nestjs/common';
import { AiCompletionInput, AiCompletionResult, AiPort } from './ai.port';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

/**
 * Adapter for a locally-hosted Ollama server (https://ollama.com) running open-source models
 * (llama3, mistral, qwen, ...). This is the recommended zero-cost "real LLM" provider for the
 * free-first policy: no API key, self-hosted, no vendor lock-in. Uses the /api/chat endpoint.
 */
export class OllamaAdapter implements AiPort {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaAdapter.name);

  constructor(private readonly cfg: OllamaConfig) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    const model = input.model ?? this.cfg.model;
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        options: { temperature: input.temperature ?? 0.7 },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`ollama error ${res.status}: ${body.slice(0, 300)}`);
      throw new Error(`ollama request failed (${res.status})`);
    }

    const data = (await res.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      provider: this.name,
      model,
      text: data.message?.content ?? '',
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
      },
    };
  }
}
