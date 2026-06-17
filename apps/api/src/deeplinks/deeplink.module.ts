import { Module } from '@nestjs/common';
import { DeepLinkController } from './deeplink.controller';
import { DeepLinkService } from './deeplink.service';

@Module({
  controllers: [DeepLinkController],
  providers: [DeepLinkService],
})
export class DeepLinkModule {}
