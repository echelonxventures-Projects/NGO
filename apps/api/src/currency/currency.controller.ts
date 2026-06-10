import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { ConvertDto } from './dto/convert.dto';
import { Public } from '../auth/public.decorator';

@Controller()
export class CurrencyController {
  constructor(private readonly currency: CurrencyService) {}

  /** Public: currencies this tenant accepts (used by the donation widget). */
  @Public()
  @Get('currencies')
  list() {
    return this.currency.listEnabled();
  }

  /** Public: convert an amount between currencies using the configured FX source. */
  @Public()
  @Post('currency/convert')
  convert(@Body() dto: ConvertDto) {
    return this.currency.convert(dto.amount, dto.from, dto.to);
  }
}
