export type OrderStatus = 
  | 'draft'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPricePaise: number; // Stored as integer paise (100 paise = 1 INR)
  totalPricePaise: number;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: ShippingAddress | null;
  status: OrderStatus;
  paymentStatus?: string;
  dispatchSnapshot?: string;
  saleSnapshot?: string;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  items?: OrderItem[];
  events?: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export function formatPaiseToINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}
