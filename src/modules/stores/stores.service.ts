import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConnectStoreDto } from './dto/connect-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { IntegrationsService } from '../integrations/integrations.service';
import { ProductsService } from '../products/products.service';
import { TrialsService } from '../trials/trials.service';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly productsService: ProductsService,
    private readonly trialsService: TrialsService,
  ) {}

  listUserStores(userId: string) {
    return this.prisma.store.findMany({
      where: { userId },
      include: { integration: true },
    });
  }

  async connectStore(userId: string, dto: ConnectStoreDto) {
    const store = await this.prisma.store.create({
      data: {
        userId,
        platform: dto.platform,
        name: dto.name,
        domain: dto.domain,
        accessToken: dto.accessToken,
        timezone: dto.timezone ?? 'Africa/Algiers',
      },
    });

    await this.integrationsService.createForStore(store);
    await this.trialsService.ensureTrial(store.id);
    await this.productsService
      .syncStoreProducts(store.id)
      .catch(() => undefined);

    return store;
  }

  async updateStore(userId: string, storeId: string, dto: UpdateStoreDto) {
    const store = await this.assertStoreOwnership(userId, storeId);

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        name: dto.name ?? store.name,
        timezone: dto.timezone ?? store.timezone,
      },
      include: { integration: true },
    });

    if (
      dto.deliveryPartnerEnabled !== undefined ||
      dto.deliveryPartnerApiKey ||
      dto.deliveryPartnerWebhookUrl
    ) {
      const integration = await this.integrationsService.updateDeliverySettings(
        storeId,
        {
          deliveryPartnerEnabled: dto.deliveryPartnerEnabled,
          deliveryPartnerApiKey: dto.deliveryPartnerApiKey,
          deliveryPartnerWebhookUrl: dto.deliveryPartnerWebhookUrl,
        },
      );
      return { ...updated, integration };
    }

    return updated;
  }

  async assertStoreOwnership(userId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.userId !== userId) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }
}
