import { IsBase64, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Base64 JSON upload — multipart can be layered on later without changing the storage port. */
export class UploadObjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  contentType?: string;

  /** File bytes, base64-encoded. */
  @IsBase64()
  dataBase64!: string;
}
