import { IsInt, IsString, Length, Min } from 'class-validator';

export class ConvertDto {
  @IsInt() @Min(0) amount!: number; // minor units in `from`
  @IsString() @Length(3, 3) from!: string;
  @IsString() @Length(3, 3) to!: string;
}
