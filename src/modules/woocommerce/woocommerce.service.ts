import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  NormalizedOrder,
  NormalizedProduct,
} from '../products/dto/normalized-product.dto';

@Injectable()
export class WoocommerceService {
  private readonly logger = new Logger(WoocommerceService.name);

  private getCredentials(accessToken?: string) {
    if (!accessToken) return { consumerKey: '', consumerSecret: '' };
    const [consumerKey, consumerSecret] = accessToken.split(':');
    return { consumerKey, consumerSecret };
  }

  async fetchProducts(
    domain: string,
    accessToken?: string,
  ): Promise<NormalizedProduct[]> {
    if (!accessToken) return [];
    const { consumerKey, consumerSecret } = this.getCredentials(accessToken);

    try {
      const response = await axios.get(
        `https://${domain}/wp-json/wc/v3/products`,
        {
          params: {
            per_page: 100,
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
          },
        },
      );

      return (response.data ?? []).map((product) => ({
        externalId: product.id?.toString(),
        title: product.name,
        price: Number(product.price),
        currency: product.currency,
        sku: product.sku,
        images: product.images,
        metadata: {
          stock_status: product.stock_status,
        },
      }));
    } catch (error) {
      this.logger.error(
        `Failed to load WooCommerce products for ${domain}`,
        error as Error,
      );
      return [];
    }
  }

  normalizeOrder(payload: any): NormalizedOrder {
    const shipping = payload?.shipping ?? {};
    return {
      externalId: payload?.id?.toString(),
      customerName:
        `${shipping.first_name ?? ''} ${shipping.last_name ?? ''}`.trim(),
      customerPhone: payload?.billing?.phone,
      customerAddress:
        `${shipping.address_1 ?? ''} ${shipping.city ?? ''}`.trim(),
      wilayaFullName: shipping.state ?? shipping.city,
      totalAmount: Number(payload?.total ?? 0),
      currency: payload?.currency ?? 'DZD',
      deliveryPrice: Number(payload?.shipping_total ?? 0) || undefined,
      products: (payload?.line_items ?? []).map((item) => ({
        externalId: item.product_id?.toString(),
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        metadata: { sku: item.sku },
      })),
    };
  }
}
