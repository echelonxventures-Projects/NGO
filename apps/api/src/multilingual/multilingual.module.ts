import { Module } from '@nestjs/common';
import { MultilingualController } from './multilingual.controller';
import { MultilingualService } from './multilingual.service';
import { AiModule } from '../ai/ai.module';

/**
 * Multilingual AI feature module. TRANSLATION_PORT and SPEECH_PORT are provided globally by
 * their provider modules; AiService comes from AiModule (for localized explanation modes).
 */
@Module({
  imports: [AiModule],
  controllers: [MultilingualController],
  providers: [MultilingualService],
})
export class MultilingualModule {}
