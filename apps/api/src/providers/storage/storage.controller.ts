import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { UploadObjectDto } from './dto/upload-object.dto';
import { RequirePermissions } from '../../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../../auth/rbac/permissions';

/**
 * Generic tenant-scoped object storage over the configured StoragePort. Authenticated by
 * default (the global JwtAuthGuard) — these are not public buckets. Tenant isolation is
 * enforced in StorageService via the `<tenantId>/` key prefix.
 */
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Upload a file (base64 JSON). Returns the stored object's key + access URL. */
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post('uploads')
  upload(@Body() dto: UploadObjectDto) {
    return this.storage.upload(dto);
  }

  /** Stream a stored object back. The wildcard captures the full `<tenantId>/...` key. */
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('files/*')
  async download(
    @Param('0') key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const obj = await this.storage.download(decodeURI(key));
    res.setHeader('Content-Type', obj.contentType);
    return new StreamableFile(obj.body);
  }

  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete('files/*')
  async remove(@Param('0') key: string) {
    await this.storage.remove(decodeURI(key));
    return { deleted: true };
  }
}
