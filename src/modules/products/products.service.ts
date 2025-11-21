import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Prisma, StorePlatform } from '@prisma/client';
import { ShopifyService } from '../shopify/shopify.service';
import { WoocommerceService } from '../woocommerce/woocommerce.service';
import { YoucanService } from '../youcan/youcan.service';
import { NormalizedProduct } from './dto/normalized-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifyService: ShopifyService,
    private readonly woocommerceService: WoocommerceService,
    private readonly youcanService: YoucanService,
  ) {}

  async syncStoreProducts(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    let products: NormalizedProduct[] = [];
    switch (store.platform) {
      case StorePlatform.SHOPIFY:
        products = await this.shopifyService.fetchProducts(store);
        break;
      case StorePlatform.WOOCOMMERCE:
        products = await this.woocommerceService.fetchProducts(
          store.domain,
          store.accessToken ?? undefined,
        );
        break;
      case StorePlatform.YOUCAN:
        products = await this.youcanService.fetchProductsForStore(store.id);
        break;
      default:
        products = [];
    }

    await this.persistProducts(storeId, products);

    await this.prisma.integration
      .update({
        where: { storeId },
        data: { lastSyncedProductsAt: new Date() },
      })
      .catch(() => undefined);

    return { synced: products.length };
  }

  async listStoreProducts(storeId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { storeId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where: { storeId } }),
    ]);

    return { items, total, page, limit };
  }

  async listStoreProductsForUser(
    storeId: string,
    userId: string,
    pagination: PaginationDto,
  ) {
    await this.ensureStoreOwnership(storeId, userId);
    return this.listStoreProducts(storeId, pagination);
  }

  async syncStoreProductsForUser(storeId: string, userId: string) {
    await this.ensureStoreOwnership(storeId, userId);
    return this.syncStoreProducts(storeId);
  }

  private async persistProducts(
    storeId: string,
    products: NormalizedProduct[],
  ) {
    if (products.length === 0) {
      this.logger.warn(`No products to sync for store ${storeId}`);
      return;
    }

    await this.prisma.$transaction(
      products.map((product) =>
        this.prisma.product.upsert({
          where: {
            storeId_externalId: { storeId, externalId: product.externalId },
          },
          create: {
            storeId,
            externalId: product.externalId,
            title: product.title,
            price: product.price ? product.price.toString() : null,
            currency: product.currency,
            sku: product.sku,
            images: (product.images ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            metadata: (product.metadata ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          },
          update: {
            title: product.title,
            price: product.price ? product.price.toString() : null,
            currency: product.currency,
            sku: product.sku,
            images: (product.images ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            metadata: (product.metadata ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            syncedAt: new Date(),
          },
        }),
      ),
    );
  }

  private async ensureStoreOwnership(storeId: string, userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }
}
