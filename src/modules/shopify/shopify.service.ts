import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Store } from '@prisma/client';
import {
  NormalizedOrder,
  NormalizedProduct,
} from '../products/dto/normalized-product.dto';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly apiVersion = '2024-07';

  async fetchProducts(store: Store): Promise<NormalizedProduct[]> {
    if (!store.accessToken) {
      return [];
    }

    try {
      const client = axios.create({
        baseURL: `https://${store.domain}/admin/api/${this.apiVersion}`,
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
          'Content-Type': 'application/json',
        },
      });

      const response = await client.get('/products.json', {
        params: { limit: 250 },
      });

      return (response.data?.products ?? []).map((product) => ({
        externalId: product.id?.toString(),
        title: product.title,
        price: Number(product.variants?.[0]?.price) || undefined,
        currency: product.variants?.[0]?.currency,
        sku: product.variants?.[0]?.sku,
        images: product.images,
        metadata: {
          tags: product.tags,
          status: product.status,
        },
      }));
    } catch (error) {
      this.logger.error(
        `Failed to sync Shopify products for store ${store.id}`,
        error as Error,
      );
      return [];
    }
  }

  normalizeOrder(payload: any): NormalizedOrder {
    const shippingAddress = payload?.shipping_address ?? {};
    const lineItems = payload?.line_items ?? [];

    return {
      externalId: payload?.id?.toString() ?? payload?.order_id,
      customerName:
        `${shippingAddress.first_name ?? ''} ${shippingAddress.last_name ?? ''}`.trim(),
      customerPhone:
        payload?.phone ?? shippingAddress?.phone ?? payload?.customer?.phone,
      customerAddress: shippingAddress?.address1,
      wilayaFullName: shippingAddress?.province,
      totalAmount: Number(
        payload?.total_price ?? payload?.current_total_price ?? 0,
      ),
      currency: payload?.currency ?? 'DZD',
      deliveryPrice:
        Number(payload?.shipping_lines?.[0]?.price ?? 0) || undefined,
      products: lineItems.map((item) => ({
        externalId: item.id?.toString(),
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        metadata: { sku: item.sku },
      })),
    };
  }
}
