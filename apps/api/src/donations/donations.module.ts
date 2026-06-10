import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PaymentModule } from '../providers/payment/payment.module';

@Module({
  imports: [PaymentModule],
  providers: [DonationsService],
  controllers: [DonationsController],
})
export class DonationsModule {}
