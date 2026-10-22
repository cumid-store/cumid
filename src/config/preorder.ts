import { DIARY_PRICING } from './pricing';

/** Owner-confirmed preorder offer. Shipping is charged once per order. */
export const PREORDER = {
  shippingRupees: 50,
  shippingPaise: 5000,
  deliveryDays: 14,
  deliveryText: 'Delivery within 14 days of payment confirmation',
} as const;

export function preorderTotal(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw new Error('Choose between 1 and 10 diaries.');
  return DIARY_PRICING.saleRupees * quantity + PREORDER.shippingRupees;
}

export function preorderMessage(product: { id: string; name: string; slug: string }, quantity = 1) {
  return `Hi CUMID! I'd like to preorder ${quantity} × ${product.name} (${product.id}).\nDiaries: ₹${DIARY_PRICING.saleRupees} × ${quantity} = ₹${DIARY_PRICING.saleRupees * quantity}\nShipping: ₹${PREORDER.shippingRupees} per order\nTotal: ₹${preorderTotal(quantity)}\n${PREORDER.deliveryText}.\nPlease confirm the product specifications, delivery PIN code and payment instructions.\nhttps://cumid.store/products/${product.slug}`;
}
