import { NotificationChannel } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Admin/test dispatch payload. Channels default from recipient data when omitted. */
export class SendNotificationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional() @IsString() userId?: string;

  /** External address (email/phone/webhook URL) for non-in-app channels. */
  @IsOptional() @IsString() to?: string;

  @IsOptional() @IsString() @MaxLength(64) type?: string;

  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;

  @IsString() @IsNotEmpty() body!: string;
}
