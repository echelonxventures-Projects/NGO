import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';

describe('LocalDiskStorageAdapter', () => {
  let root: string;

  function adapter(): LocalDiskStorageAdapter {
    const config = {
      get: (key: string) =>
        ({ 'storage.localPath': root, 'storage.publicBaseUrl': '/api/storage/files' } as Record<
          string,
          string
        >)[key],
    } as any;
    return new LocalDiskStorageAdapter(config);
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'dxp-storage-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('stores and reads back an object (roundtrip) with inferred content type', async () => {
    const a = adapter();
    const body = Buffer.from('hello world');
    const stored = await a.put({ key: 't1/uploads/greeting.txt', body });

    expect(stored.size).toBe(body.length);
    expect(stored.contentType).toBe('text/plain');
    expect(stored.url).toBe('/api/storage/files/t1/uploads/greeting.txt');

    const got = await a.get('t1/uploads/greeting.txt');
    expect(got.body.toString()).toBe('hello world');
    expect(got.contentType).toBe('text/plain');
  });

  it('honours an explicit content type on put', async () => {
    const a = adapter();
    const stored = await a.put({
      key: 't1/uploads/file.bin',
      body: Buffer.from([1, 2, 3]),
      contentType: 'application/custom',
    });
    expect(stored.contentType).toBe('application/custom');
  });

  it('reports existence and supports deletion', async () => {
    const a = adapter();
    await a.put({ key: 't1/uploads/x.pdf', body: Buffer.from('p') });

    expect(await a.exists('t1/uploads/x.pdf')).toBe(true);
    await a.delete('t1/uploads/x.pdf');
    expect(await a.exists('t1/uploads/x.pdf')).toBe(false);
  });

  it('delete is a no-op for a missing key', async () => {
    const a = adapter();
    await expect(a.delete('t1/uploads/none.txt')).resolves.toBeUndefined();
  });

  it('throws when reading a missing object', async () => {
    const a = adapter();
    await expect(a.get('t1/uploads/missing.txt')).rejects.toThrow();
  });

  it('contains path-traversal keys within the storage root', async () => {
    const a = adapter();
    await a.put({ key: '../../escape.txt', body: Buffer.from('safe') });
    // The escape attempt is sanitized and stored inside root, not outside it.
    const entries = await fs.readdir(root);
    expect(entries).toContain('escape.txt');
    const parent = await fs.readdir(path.dirname(root));
    expect(parent).not.toContain('escape.txt');
  });
});
