import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { QueueModule } from '../../queue/queue.module';
import { SseModule } from '../../sse/sse.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { WoocommerceModule } from '../woocommerce/woocommerce.module';
import { YoucanModule } from '../youcan/youcan.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    QueueModule,
    SseModule,
    ShopifyModule,
    WoocommerceModule,
    forwardRef(() => YoucanModule),
    IntegrationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
