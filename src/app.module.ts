import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { StoresModule } from './modules/stores/stores.module';
import { TrialsModule } from './modules/trials/trials.module';
import { UsersModule } from './modules/users/users.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WoocommerceModule } from './modules/woocommerce/woocommerce.module';
import { YoucanModule } from './modules/youcan/youcan.module';
import { QueueModule } from './queue/queue.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url:
            configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        }),
        ttl: 600,
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    IntegrationsModule,
    ProductsModule,
    OrdersModule,
    MessagesModule,
    TrialsModule,
    WhatsappModule,
    DeliveryModule,
    ShopifyModule,
    WoocommerceModule,
    YoucanModule,
    QueueModule,
    SseModule,
  ],
})
export class AppModule {}
