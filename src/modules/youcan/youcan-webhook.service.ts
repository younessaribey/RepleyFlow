import {
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { StorePlatform } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { YoucanService } from './youcan.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class YoucanWebhookService {
  private readonly logger = new Logger(YoucanWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youcanService: YoucanService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async handleOrderCreated(token: string, signature: string, payload: any) {
    if (!token) {
      throw new UnauthorizedException('Missing webhook token');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing YouCan signature');
    }

    const youcanStore = await this.prisma.youCanStore.findFirst({
      where: { webhookSecret: token },
      include: { store: { include: { integration: true } } },
    });

    if (!youcanStore?.store) {
      throw new UnauthorizedException('Unknown webhook token');
    }

    this.youcanService.assertValidSignature(signature, payload);

    if (!this.youcanService.isCodOrder(payload)) {
      this.logger.log('Skipping non-COD YouCan order event');
      return { skipped: true };
    }

    const integrationSecret = youcanStore.store.integration?.webhookSecret;
    if (!integrationSecret) {
      throw new UnauthorizedException('Store is missing integration secret');
    }

    await this.ordersService.handleOrderWebhook(
      StorePlatform.YOUCAN,
      integrationSecret,
      payload,
    );

    return { processed: true };
  }
}
