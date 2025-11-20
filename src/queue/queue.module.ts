import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QUEUES } from './queue.constants';
import { WhatsappProcessor } from './processors/whatsapp.processor';
import { WhatsappModule } from '../modules/whatsapp/whatsapp.module';
import { DeliveryProcessor } from './processors/delivery.processor';
import { DeliveryModule } from '../modules/delivery/delivery.module';

@Module({
  imports: [
    ConfigModule,
    WhatsappModule,
    DeliveryModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.WHATSAPP },
      { name: QUEUES.DELIVERY },
    ),
  ],
  providers: [QueueService, WhatsappProcessor, DeliveryProcessor],
  exports: [QueueService],
})
export class QueueModule {}
