import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TenantContext } from '../../tenancy/tenant-context';
import { STORAGE_PORT, StoragePort, StoredObject, RetrievedObject } from './storage.port';
import { UploadObjectDto } from './dto/upload-object.dto';

/**
 * Thin application service over the StoragePort. Its job is tenant isolation: every object
 * is stored under a `<tenantId>/...` key prefix, and reads are rejected unless the key
 * belongs to the active tenant. Feature modules (assignments, media, etc.) reuse this.
 */
@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly tenantContext: TenantContext,
  ) {}

  /** Sanitizes a client filename to a safe basename (no paths, limited charset). */
  private safeName(filename: string): string {
    const base = filename.split(/[\\/]/).pop() ?? 'file';
    return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128) || 'file';
  }

  private tenantPrefix(): string {
    return `${this.tenantContext.requireTenantId()}/`;
  }

  /** Ensures a key belongs to the active tenant; throws otherwise (cross-tenant guard). */
  private assertOwned(key: string): void {
    if (!key.startsWith(this.tenantPrefix())) {
      throw new ForbiddenException('Object does not belong to this tenant');
    }
  }

  async upload(dto: UploadObjectDto, folder = 'uploads'): Promise<StoredObject> {
    const key = `${this.tenantPrefix()}${folder}/${randomUUID()}-${this.safeName(dto.filename)}`;
    const body = Buffer.from(dto.dataBase64, 'base64');
    return this.storage.put({ key, body, contentType: dto.contentType });
  }

  async download(key: string): Promise<RetrievedObject> {
    this.assertOwned(key);
    return this.storage.get(key);
  }

  async remove(key: string): Promise<void> {
    this.assertOwned(key);
    await this.storage.delete(key);
  }
}
