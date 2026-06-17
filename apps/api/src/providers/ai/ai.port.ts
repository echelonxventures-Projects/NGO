/**
 * Capability port for text generation / chat across AI providers. Feature code (AiService)
 * depends only on this interface — never a vendor SDK. Swap the implementation via
 * AI_PROVIDER (echo | ollama | openai | gemini | anthropic | openrouter | deepseek | mistral)
 * with no feature-code changes. The free-first default is `echo` (deterministic, offline),
 * and `ollama` (local open-source models) is the recommended zero-cost real provider.
 */
export const AI_PORT = Symbol('AI_PORT');

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessageInput {
  role: AiRole;
  content: string;
}

export interface AiCompletionInput {
  /** Ordered conversation messages. A system message may be included for instructions. */
  messages: AiMessageInput[];
  /** Sampling temperature 0..2 (provider-dependent). */
  temperature?: number;
  /** Soft cap on output tokens. */
  maxTokens?: number;
  /** Optional model override; otherwise the provider's configured default is used. */
  model?: string;
}

export interface AiCompletionResult {
  provider: string;
  model: string;
  text: string;
  /** Best-effort token accounting; zero when the provider does not report usage. */
  usage: { promptTokens: number; completionTokens: number };
}

export interface AiPort {
  readonly name: string;
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
}
