import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PORT, AiPort } from './ai.port';
import { EchoAiAdapter } from './echo-ai.adapter';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import { OllamaAdapter } from './ollama.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { AnthropicAdapter } from './anthropic.adapter';

/**
 * Binds AI_PORT to the adapter selected by AI_PROVIDER (env). Falls back to the free-first
 * `echo` adapter so AI features always run with zero configuration. OpenAI/OpenRouter/DeepSeek/
 * Mistral share one OpenAI-compatible adapter (different base URL/key/model). Add providers
 * here — feature code (AiService) never changes.
 *
 * @Global so any module can inject AI_PORT.
 */
@Global()
@Module({
  providers: [
    EchoAiAdapter,
    {
      provide: AI_PORT,
      inject: [ConfigService, EchoAiAdapter],
      useFactory: (config: ConfigService, echo: EchoAiAdapter): AiPort => {
        const provider = config.get<string>('providers.ai') ?? 'echo';
        const ai = config.get('ai') as Record<string, any>;
        switch (provider) {
          case 'ollama':
            return new OllamaAdapter(ai.ollama);
          case 'openai':
            return new OpenAiCompatibleAdapter({ name: 'openai', ...ai.openai });
          case 'openrouter':
            return new OpenAiCompatibleAdapter({ name: 'openrouter', ...ai.openrouter });
          case 'deepseek':
            return new OpenAiCompatibleAdapter({ name: 'deepseek', ...ai.deepseek });
          case 'mistral':
            return new OpenAiCompatibleAdapter({ name: 'mistral', ...ai.mistral });
          case 'gemini':
            return new GeminiAdapter(ai.gemini);
          case 'anthropic':
          case 'claude':
            return new AnthropicAdapter(ai.anthropic);
          case 'echo':
          default:
            return echo;
        }
      },
    },
  ],
  exports: [AI_PORT],
})
export class AiProviderModule {}
