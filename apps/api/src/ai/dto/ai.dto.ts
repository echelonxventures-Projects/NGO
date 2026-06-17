import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EXPLANATION_MODES } from '../prompts';

export class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  content!: string;
}

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export class TutorDto {
  @IsString()
  @MinLength(1)
  question!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsIn(EXPLANATION_MODES as unknown as string[])
  mode?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class ExplainDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsIn(EXPLANATION_MODES as unknown as string[])
  mode!: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateQuizDto {
  @IsString()
  @MinLength(1)
  topic!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class SummarizeDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(1000)
  maxWords?: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class CategorizeDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsArray()
  @IsString({ each: true })
  categories!: string[];
}

export class GenerateContentDto {
  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
