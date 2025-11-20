import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { StubDeliveryPartnerService } from './providers/stub-delivery.service';

@Module({
  providers: [
    DeliveryService,
    {
      provide: 'DELIVERY_PARTNER_SERVICE',
      useClass: StubDeliveryPartnerService,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
