import { Global, Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

@Global()
@Module({
  providers: [TaxService],
  controllers: [TaxController],
  exports: [TaxService],
})
export class TaxModule {}
