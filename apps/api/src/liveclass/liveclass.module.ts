import { Module } from '@nestjs/common';
import { LiveClassController } from './liveclass.controller';
import { LiveClassService } from './liveclass.service';

@Module({
  controllers: [LiveClassController],
  providers: [LiveClassService],
})
export class LiveClassModule {}
