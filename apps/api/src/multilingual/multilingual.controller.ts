import { Body, Controller, Get, Post } from '@nestjs/common';
import { MultilingualService } from './multilingual.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import {
  ExplainLocalizedDto,
  SttDto,
  TranslateBatchDto,
  TranslateDto,
  TtsDto,
} from './dto/multilingual.dto';

@Controller('i18n')
export class MultilingualController {
  constructor(private readonly ml: MultilingualService) {}

  @Public()
  @Get('languages')
  languages() {
    return this.ml.languages();
  }

  @Public()
  @Post('translate')
  translate(@Body() dto: TranslateDto) {
    return this.ml.translate(dto.text, dto.target, dto.source);
  }

  @Public()
  @Post('translate/batch')
  translateBatch(@Body() dto: TranslateBatchDto) {
    return this.ml.translateBatch(dto.texts, dto.target, dto.source);
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('tts')
  tts(@Body() dto: TtsDto) {
    return this.ml.tts(dto.text, dto.language, dto.voice);
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('stt')
  stt(@Body() dto: SttDto) {
    return this.ml.stt(dto.audioBase64, dto.language);
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post('explain')
  explain(@Body() dto: ExplainLocalizedDto) {
    return this.ml.explainLocalized(dto.content, dto.mode, dto.language);
  }
}
