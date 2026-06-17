import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { LmsExtensionController } from './lms-extension.controller';
import { LmsExtensionService } from './lms-extension.service';

@Module({
  controllers: [LmsController, LmsExtensionController],
  providers: [LmsService, LmsExtensionService],
})
export class LmsModule {}
