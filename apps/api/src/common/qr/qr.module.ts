import { Global, Module } from '@nestjs/common';
import { QrService } from './qr.service';

/** @Global so LMS, engagement (tickets) and deep-linking can all inject QrService. */
@Global()
@Module({
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
