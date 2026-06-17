import { Logger } from '@nestjs/common';
import { AiCompletionInput, AiCompletionResult, AiPort } from './ai.port';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

/**
 * Adapter for Google Gemini (generativelanguage API). Gemini separates the system instruction
 * from the conversation and uses `contents` with `parts`. We map our message list onto that
 * shape. Uses the global `fetch`; no SDK.
 */
export class GeminiAdapter implements AiPort {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiAdapter.name);

  constructor(private readonly cfg: GeminiConfig) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.cfg.apiKey) {
      throw new Error('gemini provider selected but no API key configured');
    }
    const model = input.model ?? this.cfg.model;
    const system = input.messages.find((m) => m.role === 'system')?.content;
    const contents = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
      `?key=${encodeURIComponent(this.cfg.apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          temperature: input.temperature ?? 0.7,
          maxOutputTokens: input.maxTokens,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`gemini error ${res.status}: ${body.slice(0, 300)}`);
      throw new Error(`gemini request failed (${res.status})`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return {
      provider: this.name,
      model,
      text,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
