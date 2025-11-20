import { Order } from '@prisma/client';

export interface IDeliveryPartnerService {
  sendOrder(order: Order): Promise<{ trackingId: string; status: string }>;
  trackOrder(
    trackingId: string,
  ): Promise<{ status: string; estimatedDelivery?: Date }>;
}
