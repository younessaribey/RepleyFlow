export type NormalizedProduct = {
  externalId: string;
  title: string;
  price?: number;
  currency?: string;
  sku?: string;
  quantity?: number;
  images?: unknown;
  metadata?: Record<string, unknown>;
};

export type NormalizedOrder = {
  externalId: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  wilayaNumber?: number;
  wilayaFullName?: string;
  totalAmount: number;
  currency: string;
  deliveryPrice?: number;
  products: Array<{
    externalId?: string;
    name: string;
    price?: number;
    quantity?: number;
    metadata?: Record<string, unknown>;
  }>;
};
