import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, StorePlatform } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { sanitizeWilayaInput } from '../../common/utils/wilaya.util';
import { QueueService } from '../../queue/queue.service';
import { SseService } from '../../sse/sse.service';
import { ShopifyService } from '../shopify/shopify.service';
import { WoocommerceService } from '../woocommerce/woocommerce.service';
import { YoucanService } from '../youcan/youcan.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { NormalizedOrder } from '../products/dto/normalized-product.dto';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly sseService: SseService,
    private readonly shopifyService: ShopifyService,
    private readonly woocommerceService: WoocommerceService,
    private readonly youcanService: YoucanService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async handleOrderWebhook(
    platform: StorePlatform,
    webhookSecret: string,
    payload: any,
  ) {
    const integration =
      await this.integrationsService.findByWebhookSecret(webhookSecret);
    if (!integration) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    if (integration.store.platform !== platform) {
      throw new UnauthorizedException('Platform mismatch');
    }

    const normalized = this.normalizeOrder(platform, payload);
    const wilaya = sanitizeWilayaInput(
      normalized.wilayaNumber,
      normalized.wilayaFullName,
    );

    const order = await this.prisma.order.upsert({
      where: {
        storeId_externalId: {
          storeId: integration.storeId,
          externalId: normalized.externalId,
        },
      },
      create: {
        storeId: integration.storeId,
        externalId: normalized.externalId,
        customerName: normalized.customerName,
        customerPhone: normalized.customerPhone,
        customerAddress: normalized.customerAddress,
        wilayaNumber: wilaya.wilayaNumber ?? undefined,
        wilayaFullName: wilaya.wilayaFullName ?? undefined,
        totalAmount: normalized.totalAmount.toString(),
        currency: normalized.currency,
        deliveryPrice: normalized.deliveryPrice?.toString(),
        productsSnapshot: normalized.products as Prisma.InputJsonValue,
      },
      update: {
        customerName: normalized.customerName,
        customerPhone: normalized.customerPhone,
        customerAddress: normalized.customerAddress,
        wilayaNumber: wilaya.wilayaNumber ?? undefined,
        wilayaFullName: wilaya.wilayaFullName ?? undefined,
        totalAmount: normalized.totalAmount.toString(),
        currency: normalized.currency,
        deliveryPrice: normalized.deliveryPrice?.toString(),
        productsSnapshot: normalized.products as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      include: { store: true },
    });

    if (order.customerPhone) {
      await this.queueService.enqueueWhatsappJob({
        storeId: order.storeId,
        orderId: order.id,
        customerPhone: order.customerPhone,
        placeholders: {
          customerName: order.customerName,
          orderId: order.externalId,
          orderTotal: order.totalAmount,
          wilayaFullName: order.wilayaFullName,
          deliveryPrice: order.deliveryPrice,
        },
        language: integration.whatsappTemplateLanguage,
      });
    } else {
      this.logger.warn(
        `Order ${order.id} has no customer phone, skipping WhatsApp job`,
      );
    }

    this.sseService.emit('new_order', order, order.storeId);

    return { success: true };
  }

  async getOrderForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, store: { userId } },
      include: {
        store: true,
        messages: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async assignDelivery(
    orderId: string,
    userId: string,
    dto: AssignDeliveryDto,
  ) {
    await this.getOrderForUser(orderId, userId);
    const delay = dto.immediate === false ? 5 * 60 * 1000 : 0;
    await this.queueService.enqueueDeliveryJob(
      { orderId, partner: dto.partner },
      delay ? { delay } : undefined,
    );
    return { queued: true, delay };
  }

  async getWilayaStats(storeId: string, userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const stats = await this.prisma.order.groupBy({
      by: ['wilayaNumber', 'wilayaFullName'],
      where: { storeId },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    return stats;
  }

  private normalizeOrder(
    platform: StorePlatform,
    payload: any,
  ): NormalizedOrder {
    switch (platform) {
      case StorePlatform.SHOPIFY:
        return this.shopifyService.normalizeOrder(payload);
      case StorePlatform.WOOCOMMERCE:
        return this.woocommerceService.normalizeOrder(payload);
      case StorePlatform.YOUCAN:
        return this.youcanService.normalizeOrder(payload);
      default:
        throw new UnauthorizedException('Unsupported platform');
    }
  }
}
