import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import {
  CategorizeDto,
  ChatDto,
  ExplainDto,
  GenerateContentDto,
  GenerateQuizDto,
  SummarizeDto,
  TutorDto,
} from './dto/ai.dto';

/**
 * AI feature endpoints. All require the `ai:use` permission (granted to teachers/students/
 * admins by default). The active provider is reported by /ai/provider for transparency.
 */
@RequirePermissions(PERMISSIONS.AI_USE)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('provider')
  provider() {
    return { provider: this.ai.providerName };
  }

  @Post('chat')
  chat(@Body() dto: ChatDto, @CurrentUser() me: AuthUser) {
    return this.ai.chat({
      messages: dto.messages,
      userId: me.userId,
      conversationId: dto.conversationId,
      feature: dto.feature,
      temperature: dto.temperature,
    });
  }

  @Post('tutor')
  tutor(@Body() dto: TutorDto, @CurrentUser() me: AuthUser) {
    return this.ai.tutor({ ...dto, userId: me.userId });
  }

  @Post('explain')
  explain(@Body() dto: ExplainDto) {
    return this.ai.explain(dto.content, dto.mode, dto.language);
  }

  @Post('content')
  content(@Body() dto: GenerateContentDto) {
    return this.ai.generateContent(dto.prompt, dto.format, dto.language);
  }

  @Post('quiz')
  quiz(@Body() dto: GenerateQuizDto) {
    return this.ai.generateQuiz(dto.topic, dto.count, dto.language);
  }

  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.ai.summarize(dto.text, dto.maxWords, dto.language);
  }

  @Post('seo')
  seo(@Body() dto: SummarizeDto) {
    return this.ai.seoAssist(dto.text, dto.language);
  }

  @Post('categorize')
  categorize(@Body() dto: CategorizeDto) {
    return this.ai.categorize(dto.text, dto.categories);
  }

  @Get('conversations')
  conversations(@CurrentUser() me: AuthUser) {
    return this.ai.listConversations(me.userId);
  }

  @Get('conversations/:id')
  conversation(@Param('id') id: string) {
    return this.ai.getConversation(id);
  }
}
