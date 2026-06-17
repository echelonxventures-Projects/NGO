import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

/**
 * AI feature module. The provider adapter is supplied globally by AiProviderModule (AI_PORT),
 * so this module only wires the feature service + controller.
 */
@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
