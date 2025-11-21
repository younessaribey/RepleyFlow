import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TrialsModule } from '../trials/trials.module';
import { OrdersModule } from '../orders/orders.module';
import { YoucanService } from './youcan.service';
import { YoucanController } from './youcan.controller';
import { YoucanWebhookController } from './youcan-webhook.controller';
import { YoucanWebhookService } from './youcan-webhook.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    IntegrationsModule,
    TrialsModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [YoucanController, YoucanWebhookController],
  providers: [YoucanService, YoucanWebhookService, EncryptionService],
  exports: [YoucanService],
})
export class YoucanModule {}
