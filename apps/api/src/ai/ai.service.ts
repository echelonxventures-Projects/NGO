import { Inject, Injectable, Logger } from '@nestjs/common';
import { AI_PORT, AiPort, AiMessageInput } from '../providers/ai/ai.port';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  buildCategorizePrompt,
  buildExplainPrompt,
  buildQuizPrompt,
  buildSummaryPrompt,
  buildTutorPrompt,
  ExplanationMode,
  isExplanationMode,
  PromptMessage,
} from './prompts';

/**
 * AI feature service. Depends only on the AI_PORT capability port, so it works identically
 * with the free-first `echo` provider, a local Ollama server, or any hosted provider. Higher
 * level features (tutor, quiz generation, summaries, explanation modes, SEO, categorization)
 * are expressed as prompt templates over the same `complete()` primitive.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PORT) private readonly ai: AiPort,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  get providerName(): string {
    return this.ai.name;
  }

  // ---------- Raw chat (with optional persistence) ----------

  async chat(params: {
    messages: AiMessageInput[];
    userId?: string;
    conversationId?: string;
    feature?: string;
    temperature?: number;
  }) {
    const result = await this.ai.complete({
      messages: params.messages,
      temperature: params.temperature,
    });

    const conversationId = await this.persist({
      conversationId: params.conversationId,
      userId: params.userId,
      feature: params.feature ?? 'chat',
      userMessages: params.messages,
      assistantText: result.text,
      provider: result.provider,
      model: result.model,
    });

    return { ...result, conversationId };
  }

  // ---------- Feature helpers (prompt templates) ----------

  async tutor(params: {
    question: string;
    subject?: string;
    mode?: string;
    language?: string;
    userId?: string;
    conversationId?: string;
  }) {
    const mode = params.mode && isExplanationMode(params.mode) ? params.mode : undefined;
    const messages = buildTutorPrompt(params.question, {
      subject: params.subject,
      mode,
      language: params.language,
    });
    return this.runFeature(messages, 'tutor', params.userId, params.conversationId);
  }

  async explain(content: string, mode: string, language?: string) {
    const safeMode: ExplanationMode = isExplanationMode(mode) ? mode : 'beginner';
    const messages = buildExplainPrompt(content, safeMode, language ?? 'English');
    const result = await this.ai.complete({ messages });
    return { mode: safeMode, ...result };
  }

  async generateContent(prompt: string, format?: string, language?: string) {
    const messages: PromptMessage[] = [
      {
        role: 'system',
        content:
          'You are a professional content writer for a non-profit / education platform. ' +
          `Produce ${format ?? 'well-structured prose'}. Respond in ${language ?? 'English'}.`,
      },
      { role: 'user', content: prompt },
    ];
    return this.runFeature(messages, 'content');
  }

  async lessonPlan(topic: string, language?: string) {
    const messages: PromptMessage[] = [
      {
        role: 'system',
        content:
          'You are an instructional designer. Produce a lesson plan with objectives, ' +
          `duration, activities, materials and assessment. Respond in ${language ?? 'English'}.`,
      },
      { role: 'user', content: `Create a lesson plan for: ${topic}` },
    ];
    return this.runFeature(messages, 'lesson-plan');
  }

  async summarize(text: string, maxWords?: number, language?: string) {
    const messages = buildSummaryPrompt(text, maxWords ?? 150, language ?? 'English');
    return this.runFeature(messages, 'summary');
  }

  async seoAssist(text: string, language?: string) {
    const messages: PromptMessage[] = [
      {
        role: 'system',
        content:
          'You are an SEO assistant. Given content, return a JSON object: ' +
          '{"title":string,"description":string,"keywords":[string]}. ' +
          `title <= 60 chars, description <= 155 chars. Respond in ${language ?? 'English'}. JSON only.`,
      },
      { role: 'user', content: text },
    ];
    const result = await this.ai.complete({ messages });
    return { provider: result.provider, model: result.model, seo: this.tryJson(result.text), raw: result.text };
  }

  async generateQuiz(topic: string, count = 5, language?: string) {
    const messages = buildQuizPrompt(topic, count, language ?? 'English');
    const result = await this.ai.complete({ messages });
    const parsed = this.tryJson(result.text) as { questions?: unknown[] } | null;
    return {
      provider: result.provider,
      model: result.model,
      questions: Array.isArray(parsed?.questions) ? parsed!.questions : [],
      raw: result.text,
    };
  }

  async categorize(text: string, categories: string[]) {
    const messages = buildCategorizePrompt(text, categories);
    const result = await this.ai.complete({ messages });
    const answer = result.text.trim();
    // Prefer an exact category match; otherwise return the model's raw answer.
    const match = categories.find((c) => answer.toLowerCase().includes(c.toLowerCase()));
    return { provider: result.provider, category: match ?? answer, raw: result.text };
  }

  // ---------- Conversation history ----------

  listConversations(userId?: string) {
    return this.prisma.scoped().aiConversation.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  getConversation(id: string) {
    return this.prisma.scoped().aiConversation.findFirst({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // ---------- internals ----------

  private async runFeature(
    messages: PromptMessage[],
    feature: string,
    userId?: string,
    conversationId?: string,
  ) {
    const result = await this.ai.complete({ messages });
    const convId = await this.persist({
      conversationId,
      userId,
      feature,
      userMessages: messages,
      assistantText: result.text,
      provider: result.provider,
      model: result.model,
    });
    return { ...result, conversationId: convId };
  }

  private async persist(params: {
    conversationId?: string;
    userId?: string;
    feature: string;
    userMessages: { role: string; content: string }[];
    assistantText: string;
    provider: string;
    model: string;
  }): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();
    let conversationId = params.conversationId;

    if (conversationId) {
      const existing = await this.prisma.scoped().aiConversation.findFirst({
        where: { id: conversationId },
        select: { id: true },
      });
      if (!existing) conversationId = undefined;
    }

    if (!conversationId) {
      const created = await this.prisma.scoped().aiConversation.create({
        data: {
          tenantId,
          userId: params.userId,
          feature: params.feature,
          title: params.userMessages.find((m) => m.role === 'user')?.content.slice(0, 80),
        },
      });
      conversationId = created.id;
    } else {
      await this.prisma.scoped().aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    // Persist only the latest user turn + assistant reply (system prompts are not stored).
    const lastUser = [...params.userMessages].reverse().find((m) => m.role === 'user');
    const rows = [
      ...(lastUser
        ? [{ tenantId, conversationId, role: 'user', content: lastUser.content }]
        : []),
      {
        tenantId,
        conversationId,
        role: 'assistant',
        content: params.assistantText,
        provider: params.provider,
        model: params.model,
      },
    ];
    await this.prisma.scoped().aiMessage.createMany({ data: rows });
    return conversationId;
  }

  private tryJson(text: string): unknown | null {
    try {
      // Tolerate code fences and leading prose around a JSON body.
      const match = text.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : text);
    } catch {
      return null;
    }
  }
}
