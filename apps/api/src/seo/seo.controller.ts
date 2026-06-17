import { Controller, Get, Param } from '@nestjs/common';
import { SeoService } from './seo.service';
import { Public } from '../auth/public.decorator';

/** Public Schema.org JSON-LD endpoints consumed by the SSR renderer for per-entity SEO. */
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get('organization')
  organization() {
    return this.seo.organization();
  }

  @Public()
  @Get('event/:slug')
  event(@Param('slug') slug: string) {
    return this.seo.event(slug);
  }

  @Public()
  @Get('course/:slug')
  course(@Param('slug') slug: string) {
    return this.seo.course(slug);
  }

  @Public()
  @Get('product/:slug')
  product(@Param('slug') slug: string) {
    return this.seo.product(slug);
  }

  @Public()
  @Get('article/:slug')
  article(@Param('slug') slug: string) {
    return this.seo.article(slug);
  }
}
