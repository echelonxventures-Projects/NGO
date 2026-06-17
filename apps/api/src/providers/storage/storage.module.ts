import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PORT, StoragePort } from './storage.port';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

/**
 * Binds STORAGE_PORT to the adapter selected by STORAGE_PROVIDER (env). Falls back to the
 * free local-disk adapter so the platform always runs. Add more adapters (gcs, azure) to the
 * switch — no feature code changes required.
 */
@Global()
@Module({
  controllers: [StorageController],
  providers: [
    LocalDiskStorageAdapter,
    S3StorageAdapter,
    StorageService,
    {
      provide: STORAGE_PORT,
      inject: [ConfigService, LocalDiskStorageAdapter, S3StorageAdapter],
      useFactory: (
        config: ConfigService,
        local: LocalDiskStorageAdapter,
        s3: S3StorageAdapter,
      ): StoragePort => {
        const provider = config.get<string>('providers.storage') ?? 'local';
        switch (provider) {
          case 's3':
            return s3;
          case 'local':
          default:
            return local;
        }
      },
    },
  ],
  exports: [STORAGE_PORT, StorageService],
})
export class StorageModule {}
