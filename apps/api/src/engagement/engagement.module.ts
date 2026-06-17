import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
import { EngagementOpsController } from './engagement-ops.controller';
import { EngagementOpsService } from './engagement-ops.service';

@Module({
  controllers: [EngagementController, EngagementOpsController],
  providers: [EngagementService, EngagementOpsService],
  exports: [EngagementOpsService],
})
export class EngagementModule {}
