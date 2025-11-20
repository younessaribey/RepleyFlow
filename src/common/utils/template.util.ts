export type TemplatePlaceholders = {
  customerName?: string;
  orderId?: string;
  orderTotal?: string;
  wilayaFullName?: string;
  deliveryPrice?: string;
};

export const sanitizeTemplatePlaceholders = (
  placeholders: TemplatePlaceholders,
): TemplatePlaceholders => {
  const entries = Object.entries(placeholders)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => [key, String(value).trim()]);

  return Object.fromEntries(entries);
};

export const buildTemplateComponents = (placeholders: TemplatePlaceholders) =>
  Object.values(sanitizeTemplatePlaceholders(placeholders));
