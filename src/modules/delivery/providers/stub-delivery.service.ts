import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IDeliveryPartnerService } from '../interfaces/delivery-partner.interface';

@Injectable()
export class StubDeliveryPartnerService implements IDeliveryPartnerService {
  async sendOrder(_order: Order) {
    return {
      trackingId: randomUUID(),
      status: 'IN_TRANSIT',
    };
  }

  async trackOrder(_trackingId: string) {
    return {
      status: 'IN_TRANSIT',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }
}
