import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { IDeliveryPartnerService } from './interfaces/delivery-partner.interface';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('DELIVERY_PARTNER_SERVICE')
    private readonly deliveryPartner: IDeliveryPartnerService,
  ) {}

  async dispatchOrder(orderId: string, partner?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result = await this.deliveryPartner.sendOrder(order);

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        trackingId: result.trackingId,
        deliveryStatus: DeliveryStatus.IN_TRANSIT,
        deliveryPartnerRef: partner ?? result.status,
      },
    });
  }
}
