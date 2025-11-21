import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus, MessageStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const [
      totalStores,
      totalOrders,
      totalMessages,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      recentOrders,
      messageSent,
      messageDelivered,
      messageFailed,
    ] = await Promise.all([
      this.prisma.store.count({ where: { userId } }),
      this.prisma.order.count({
        where: { store: { userId } },
      }),
      this.prisma.message.count({
        where: { store: { userId } },
      }),
      this.prisma.order.count({
        where: {
          store: { userId },
          status: OrderStatus.PENDING_CONFIRMATION,
        },
      }),
      this.prisma.order.count({
        where: {
          store: { userId },
          status: OrderStatus.CONFIRMED,
        },
      }),
      this.prisma.order.count({
        where: {
          store: { userId },
          status: OrderStatus.CANCELLED,
        },
      }),
      this.prisma.order.findMany({
        where: { store: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          store: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.message.count({
        where: {
          store: { userId },
          status: MessageStatus.SENT,
        },
      }),
      this.prisma.message.count({
        where: {
          store: { userId },
          status: MessageStatus.DELIVERED,
        },
      }),
      this.prisma.message.count({
        where: {
          store: { userId },
          status: MessageStatus.FAILED,
        },
      }),
    ]);

    return {
      totalStores,
      totalOrders,
      totalMessages,
      pendingOrders,
      confirmedOrders,
      deliveredOrders: cancelledOrders, // Using cancelled count for now
      recentOrders,
      messageStats: {
        sent: messageSent,
        delivered: messageDelivered,
        failed: messageFailed,
      },
    };
  }
}
