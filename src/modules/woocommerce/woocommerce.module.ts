import { Module } from '@nestjs/common';
import { WoocommerceService } from './woocommerce.service';

@Module({
  providers: [WoocommerceService],
  exports: [WoocommerceService],
})
export class WoocommerceModule {}
