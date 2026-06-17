import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CheckInDto {
  @IsString() ticketCode!: string;
}

export class LogHoursDto {
  @IsString() signupId!: string;
  @IsInt() @Min(0) hours!: number;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() note?: string;
}

export class VerifyHoursDto {
  @IsBoolean() verified!: boolean;
}

export class AddBenefitDto {
  @IsString() planId!: string;
  @IsString() @MinLength(1) key!: string;
  @IsString() @MinLength(1) label!: string;
  @IsOptional() @IsString() value?: string;
}
