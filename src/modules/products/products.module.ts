import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ShopifyModule } from '../shopify/shopify.module';
import { WoocommerceModule } from '../woocommerce/woocommerce.module';
import { YoucanModule } from '../youcan/youcan.module';

@Module({
  imports: [ShopifyModule, WoocommerceModule, YoucanModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
