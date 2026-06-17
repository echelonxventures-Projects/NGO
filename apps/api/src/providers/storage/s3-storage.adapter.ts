import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectInput,
  RetrievedObject,
  StoragePort,
  StoredObject,
} from './storage.port';

interface S3Config {
  endpoint: string | null;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

/**
 * S3-compatible storage (AWS S3 or self-hosted MinIO — both honour the same API, keeping
 * the platform free-of-lock-in). The AWS SDK is loaded lazily via a non-literal dynamic
 * import so it stays an OPTIONAL dependency: the build and the free-first local default
 * never require it. Enable with STORAGE_PROVIDER=s3 after `npm i @aws-sdk/client-s3`.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  readonly name = 's3';
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly cfg: S3Config;
  private client: unknown;
  private sdk: any;

  constructor(config: ConfigService) {
    this.cfg = config.get<S3Config>('storage.s3')!;
  }

  /** Lazily import the SDK + construct the client. Non-literal specifier => optional dep. */
  private async ensureClient(): Promise<void> {
    if (this.client) return;
    const moduleName = '@aws-sdk/client-s3';
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      this.sdk = await import(/* webpackIgnore: true */ moduleName);
    } catch {
      throw new Error(
        `STORAGE_PROVIDER=s3 requires the optional dependency "${moduleName}". ` +
          `Install it with: npm i ${moduleName}`,
      );
    }
    this.client = new this.sdk.S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint ?? undefined,
      forcePathStyle: Boolean(this.cfg.endpoint), // MinIO needs path-style addressing
      credentials: {
        accessKeyId: this.cfg.accessKey,
        secretAccessKey: this.cfg.secretKey,
      },
    });
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    await this.ensureClient();
    await (this.client as any).send(
      new this.sdk.PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    this.logger.debug(`stored ${input.key} (${input.body.length} bytes) in ${this.cfg.bucket}`);
    return {
      key: input.key,
      url: this.url(input.key),
      size: input.body.length,
      contentType: input.contentType ?? 'application/octet-stream',
    };
  }

  async get(key: string): Promise<RetrievedObject> {
    await this.ensureClient();
    try {
      const res = await (this.client as any).send(
        new this.sdk.GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
      const body = await this.streamToBuffer(res.Body);
      return { body, contentType: res.ContentType ?? 'application/octet-stream' };
    } catch {
      throw new NotFoundException(`Object not found: ${key}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureClient();
    try {
      await (this.client as any).send(
        new this.sdk.HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureClient();
    await (this.client as any).send(
      new this.sdk.DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
    );
  }

  url(key: string): string {
    const encoded = encodeURI(key);
    if (this.cfg.endpoint) {
      return `${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucket}/${encoded}`;
    }
    return `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com/${encoded}`;
  }

  /** Collects a Node Readable / web stream into a Buffer. */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    if (Buffer.isBuffer(stream)) return stream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
