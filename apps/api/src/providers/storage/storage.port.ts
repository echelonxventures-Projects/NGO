/**
 * Capability port for object storage. Feature code (uploads, media, assignment submissions,
 * receipts/certificates as files) depends only on this interface — never a vendor SDK.
 * Swap the implementation via STORAGE_PROVIDER (local | s3) with no feature-code changes.
 */
export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface PutObjectInput {
  /** Logical key, e.g. "tenant123/assignments/abc.pdf". Adapters treat it as opaque. */
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface StoredObject {
  key: string;
  /** A URL the client can use to fetch the object (relative or absolute, adapter-defined). */
  url: string;
  size: number;
  contentType: string;
}

export interface RetrievedObject {
  body: Buffer;
  contentType: string;
}

export interface StoragePort {
  readonly name: string;
  /** Stores (or overwrites) an object and returns its metadata + access URL. */
  put(input: PutObjectInput): Promise<StoredObject>;
  /** Reads an object back. Throws if the key does not exist. */
  get(key: string): Promise<RetrievedObject>;
  /** True if an object exists at the key. */
  exists(key: string): Promise<boolean>;
  /** Removes an object. No-op if it does not exist. */
  delete(key: string): Promise<void>;
  /** Resolves the access URL for a key without reading the body. */
  url(key: string): string;
}
