import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  NormalizedOrder,
  NormalizedProduct,
} from '../products/dto/normalized-product.dto';

@Injectable()
export class YoucanService {
  private readonly logger = new Logger(YoucanService.name);
  private readonly baseUrl = 'https://api.youcan.shop';

  async fetchProducts(accessToken?: string): Promise<NormalizedProduct[]> {
    if (!accessToken) return [];

    try {
      const response = await axios.get(`${this.baseUrl}/v1/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return (response.data?.data ?? []).map((product) => {
        const amount =
          product.price?.amount !== undefined && product.price?.amount !== null
            ? Number(product.price.amount)
            : Number(product.price);

        return {
          externalId: product.id,
          title: product.title,
          price: amount,
          currency: product.price?.currency ?? 'DZD',
          sku: product.sku,
          images: product.images,
          metadata: {
            status: product.status,
          },
        };
      });
    } catch (error) {
      this.logger.error('Failed to fetch YouCan products', error as Error);
      return [];
    }
  }

  normalizeOrder(payload: any): NormalizedOrder {
    const address = payload?.shipping_address ?? {};
    return {
      externalId: payload?.id?.toString(),
      customerName:
        `${address.first_name ?? ''} ${address.last_name ?? ''}`.trim(),
      customerPhone: payload?.customer?.phone ?? address.phone,
      customerAddress: `${address.address1 ?? ''} ${address.city ?? ''}`.trim(),
      wilayaFullName: address.city,
      totalAmount: Number(payload?.total_price ?? 0),
      currency: payload?.currency ?? 'DZD',
      deliveryPrice: Number(payload?.shipping_price ?? 0) || undefined,
      products: (payload?.line_items ?? []).map((item) => ({
        externalId: item.product_id?.toString(),
        name: item.title,
        price: Number(item.price ?? item.total),
        quantity: item.quantity,
      })),
    };
  }
}
