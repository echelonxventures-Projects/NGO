import { Module } from '@nestjs/common';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { CommerceOpsController } from './commerce-ops.controller';
import { CommerceOpsService } from './commerce-ops.service';

@Module({
  controllers: [CommerceController, CommerceOpsController],
  providers: [CommerceService, CommerceOpsService],
})
export class CommerceModule {}
