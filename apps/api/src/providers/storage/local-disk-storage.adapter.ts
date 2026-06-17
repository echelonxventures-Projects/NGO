import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  PutObjectInput,
  RetrievedObject,
  StoragePort,
  StoredObject,
} from './storage.port';

/** Minimal extension → MIME map for read-back; falls back to octet-stream. */
const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Free-first default storage. Writes objects to a local directory (STORAGE_LOCAL_PATH) and
 * serves them back through StorageController. Zero external services — the platform runs
 * out of the box. Swap to S3/MinIO via STORAGE_PROVIDER=s3 with no feature-code changes.
 */
@Injectable()
export class LocalDiskStorageAdapter implements StoragePort {
  readonly name = 'local';
  private readonly logger = new Logger(LocalDiskStorageAdapter.name);
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get<string>('storage.localPath') ?? './storage/uploads');
    this.publicBaseUrl = config.get<string>('storage.publicBaseUrl') ?? '/api/storage/files';
  }

  /**
   * Resolves a logical key to an absolute path, guarding against path traversal: the
   * resolved path must stay inside the storage root, otherwise we reject the key.
   */
  private resolveKey(key: string): string {
    const normalized = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '');
    const full = path.resolve(this.root, normalized);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new NotFoundException('Invalid storage key');
    }
    return full;
  }

  private mimeFor(key: string, fallback?: string): string {
    if (fallback) return fallback;
    return MIME_BY_EXT[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const full = this.resolveKey(input.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.body);
    this.logger.debug(`stored ${input.key} (${input.body.length} bytes)`);
    return {
      key: input.key,
      url: this.url(input.key),
      size: input.body.length,
      contentType: this.mimeFor(input.key, input.contentType),
    };
  }

  async get(key: string): Promise<RetrievedObject> {
    const full = this.resolveKey(key);
    try {
      const body = await fs.readFile(full);
      return { body, contentType: this.mimeFor(key) };
    } catch {
      throw new NotFoundException(`Object not found: ${key}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch {
      // no-op if missing
    }
  }

  url(key: string): string {
    return `${this.publicBaseUrl}/${encodeURI(key)}`;
  }
}
