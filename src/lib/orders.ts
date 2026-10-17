import { supabase, isSupabaseConfigured } from './supabase';
import type { Order, OrderStatus } from '../types/order';

const LOCAL_DEMO_ORDERS_KEY = 'cumid_demo_orders_v1';

// Seed demo order for guest preview if no orders exist locally
const SAMPLE_DEMO_ORDERS: Order[] = [
  {
    id: 'demo-ord-001',
    orderNumber: 'CMD-2026-0042',
    userId: 'demo-user',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 9876543210',
    customerEmail: 'aarav@example.com',
    shippingAddress: {
      fullName: 'Aarav Sharma',
      phone: '+91 9876543210',
      street: 'Flat 402, Lotus Greens, Sector 45',
      landmark: 'Near City Park',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122003',
    },
    status: 'in_production',
    subtotalPaise: 49900,
    shippingPaise: 5000,
    totalPaise: 54900,
    trackingNumber: null,
    trackingCarrier: null,
    notes: 'Agreed batch pricing confirmed via WhatsApp on Oct 16.',
    items: [
      {
        id: 'item-001',
        orderId: 'demo-ord-001',
        productId: 'CUMID-FL-001',
        productName: 'Lavender Bloom',
        quantity: 1,
        unitPricePaise: 49900,
        totalPricePaise: 49900,
      },
    ],
    events: [
      {
        id: 'ev-1',
        orderId: 'demo-ord-001',
        eventType: 'order_created',
        description: 'WhatsApp preorder draft created following customer chat.',
        createdAt: '2026-10-16T10:30:00Z',
      },
      {
        id: 'ev-2',
        orderId: 'demo-ord-001',
        eventType: 'order_confirmed',
        description: 'Order confirmed with customer after price & specification agreement.',
        createdAt: '2026-10-16T14:15:00Z',
      },
      {
        id: 'ev-3',
        orderId: 'demo-ord-001',
        eventType: 'in_production',
        description: 'Batch #1 top spiral binding in production.',
        createdAt: '2026-10-17T09:00:00Z',
      },
    ],
    createdAt: '2026-10-16T10:30:00Z',
    updatedAt: '2026-10-17T09:00:00Z',
  },
];

function getLocalOrders(): Order[] {
  if (typeof window === 'undefined') return SAMPLE_DEMO_ORDERS;
  try {
    const raw = localStorage.getItem(LOCAL_DEMO_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DEMO_ORDERS_KEY, JSON.stringify(SAMPLE_DEMO_ORDERS));
      return SAMPLE_DEMO_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_DEMO_ORDERS;
  }
}

function saveLocalOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DEMO_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Could not persist local demo orders', e);
  }
}

/**
 * Fetch customer's orders (with graceful fallback if Supabase is offline)
 */
export async function getCustomerOrders(userId?: string): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return getLocalOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        events:order_events(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data.map(mapDbOrderToModel);
  } catch (err) {
    console.warn('Supabase getCustomerOrders fallback note:', err);
    return getLocalOrders();
  }
}

/**
 * Fetch a single order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured || !supabase) {
    const local = getLocalOrders();
    return local.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        events:order_events(*)
      `)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .single();

    if (error) throw error;
    return mapDbOrderToModel(data);
  } catch (err) {
    console.warn('Supabase getOrderById fallback note:', err);
    const local = getLocalOrders();
    return local.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
  }
}

/**
 * Admin: Fetch all orders with optional status filter
 */
export async function getAllOrders(statusFilter?: string): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    const orders = getLocalOrders();
    return statusFilter && statusFilter !== 'all'
      ? orders.filter((o) => o.status === statusFilter)
      : orders;
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        events:order_events(*)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDbOrderToModel);
  } catch (err) {
    console.warn('Supabase getAllOrders fallback note:', err);
    return getLocalOrders();
  }
}

/**
 * Admin: Create an agreed WhatsApp order draft
 */
export async function createOrderDraft(orderData: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: any;
  items: Array<{ productId: string; productName: string; quantity: number; unitPricePaise: number }>;
  shippingPaise: number;
  notes?: string;
}): Promise<{ success: boolean; order?: Order; error?: string }> {
  // Validate totals on server-side model
  const subtotalPaise = orderData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPricePaise,
    0
  );
  const totalPaise = subtotalPaise + orderData.shippingPaise;
  const orderNumber = `CMD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerEmail: orderData.customerEmail,
    shippingAddress: orderData.shippingAddress,
    status: 'draft',
    subtotalPaise,
    shippingPaise: orderData.shippingPaise,
    totalPaise,
    notes: orderData.notes,
    items: orderData.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPricePaise: it.unitPricePaise,
      totalPricePaise: it.quantity * it.unitPricePaise,
    })),
    events: [
      {
        id: `ev-${Date.now()}`,
        orderId: `ord-${Date.now()}`,
        eventType: 'order_draft_created',
        description: 'Order draft created in admin dashboard from WhatsApp agreement.',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const orders = [newOrder, ...getLocalOrders()];
    saveLocalOrders(orders);
    return { success: true, order: newOrder };
  }

  try {
    const { data: dbOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail,
        shipping_address: orderData.shippingAddress,
        status: 'draft',
        subtotal_paise: subtotalPaise,
        shipping_paise: orderData.shippingPaise,
        total_paise: totalPaise,
        notes: orderData.notes,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Insert items snapshot
    if (orderData.items.length > 0) {
      const itemsPayload = orderData.items.map((it) => ({
        order_id: dbOrder.id,
        product_id: it.productId,
        product_name: it.productName,
        quantity: it.quantity,
        unit_price_paise: it.unitPricePaise,
        total_price_paise: it.quantity * it.unitPricePaise,
      }));
      await supabase.from('order_items').insert(itemsPayload);
    }

    // Insert initial event
    await supabase.from('order_events').insert({
      order_id: dbOrder.id,
      event_type: 'order_draft_created',
      description: 'Order draft created following WhatsApp pricing agreement.',
    });

    return { success: true, order: mapDbOrderToModel(dbOrder) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not create order in database.' };
  }
}

/**
 * Admin: Update status with timeline event
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  eventDescription?: string
): Promise<{ success: boolean; error?: string }> {
  const desc = eventDescription || `Order status updated to ${newStatus.replace('_', ' ')}.`;

  if (!isSupabaseConfigured || !supabase) {
    const orders = getLocalOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = newStatus;
      orders[idx].updatedAt = new Date().toISOString();
      orders[idx].events = orders[idx].events || [];
      orders[idx].events.push({
        id: `ev-${Date.now()}`,
        orderId,
        eventType: `status_${newStatus}`,
        description: desc,
        createdAt: new Date().toISOString(),
      });
      saveLocalOrders(orders);
      return { success: true };
    }
    return { success: false, error: 'Order not found in local demo store.' };
  }

  try {
    const { error: updErr } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updErr) throw updErr;

    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: `status_${newStatus}`,
      description: desc,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not update order status.' };
  }
}

/**
 * Admin: Add or update tracking details
 */
export async function updateOrderTracking(
  orderId: string,
  trackingNumber: string,
  carrier: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const orders = getLocalOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx].trackingNumber = trackingNumber;
      orders[idx].trackingCarrier = carrier;
      orders[idx].status = 'dispatched';
      orders[idx].updatedAt = new Date().toISOString();
      orders[idx].events = orders[idx].events || [];
      orders[idx].events.push({
        id: `ev-${Date.now()}`,
        orderId,
        eventType: 'dispatched',
        description: `Dispatched via ${carrier}. Tracking number: ${trackingNumber}.`,
        createdAt: new Date().toISOString(),
      });
      saveLocalOrders(orders);
      return { success: true };
    }
    return { success: false, error: 'Order not found.' };
  }

  try {
    const { error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        tracking_carrier: carrier,
        status: 'dispatched',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'dispatched',
      description: `Dispatched via ${carrier}. Tracking number: ${trackingNumber}.`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not save tracking details.' };
  }
}

/**
 * Customer: Request order cancellation or help
 */
export async function requestOrderCancellation(
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const orders = getLocalOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx].cancellationReason = reason;
      orders[idx].events = orders[idx].events || [];
      orders[idx].events.push({
        id: `ev-${Date.now()}`,
        orderId,
        eventType: 'cancellation_requested',
        description: `Customer requested cancellation: ${reason}`,
        createdAt: new Date().toISOString(),
      });
      saveLocalOrders(orders);
      return { success: true };
    }
    return { success: false, error: 'Order not found.' };
  }

  try {
    const { error } = await supabase
      .from('orders')
      .update({
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'cancellation_requested',
      description: `Customer requested cancellation: ${reason}`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not submit cancellation request.' };
  }
}

function mapDbOrderToModel(data: any): Order {
  return {
    id: data.id,
    orderNumber: data.order_number,
    userId: data.user_id,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    shippingAddress: data.shipping_address,
    status: data.status,
    subtotalPaise: Number(data.subtotal_paise || 0),
    shippingPaise: Number(data.shipping_paise || 0),
    totalPaise: Number(data.total_paise || 0),
    trackingNumber: data.tracking_number,
    trackingCarrier: data.tracking_carrier,
    cancellationReason: data.cancellation_reason,
    notes: data.notes,
    items: (data.items || []).map((it: any) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id,
      productName: it.product_name,
      quantity: it.quantity,
      unitPricePaise: Number(it.unit_price_paise || 0),
      totalPricePaise: Number(it.total_price_paise || 0),
    })),
    events: (data.events || []).map((ev: any) => ({
      id: ev.id,
      orderId: ev.order_id,
      eventType: ev.event_type,
      description: ev.description,
      createdAt: ev.created_at,
    })),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
