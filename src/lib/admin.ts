import { supabase, isSupabaseConfigured } from './supabase';
import type { AdminStats, StoreSettings, AdminAuditLog } from '../types/admin';
import type { Batch } from '../types/batch';
import { PRODUCTS } from '../data/products';
import { getAllOrders } from './orders';
import { getAllEnquiries } from './enquiries';

const LOCAL_BATCHES_KEY = 'cumid_demo_batches_v1';
const LOCAL_SETTINGS_KEY = 'cumid_demo_settings_v1';
const LOCAL_AUDIT_KEY = 'cumid_demo_audit_v1';

const DEFAULT_SETTINGS: StoreSettings = {
  supportEmail: 'support@cumid.store',
  supportPhone: '+91 9201871597',
  whatsappNumber: '+91 9201871597',
  defaultShippingPaise: 5000, // Rs. 50
  freeShippingThresholdPaise: 99900, // Rs. 999
  estimatedDeliveryDays: '4 to 7 business days across India',
  enquiryRetentionDays: 90,
  accountRetentionDays: 180,
  returnWindowDays: 2, // 48h for transit damage
};

const SAMPLE_BATCHES: Batch[] = [
  {
    id: 'batch-001',
    name: 'Batch #1 — Launch Production Run',
    targetQuantity: 300,
    expectedDispatchDate: '2026-11-10',
    status: 'in_production',
    notes: 'Initial production run of top-spiral square pocket diaries across all 13 covers.',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
  },
  {
    id: 'batch-002',
    name: 'Batch #2 — Winter Reserve Batch',
    targetQuantity: 500,
    expectedDispatchDate: '2026-12-05',
    status: 'planned',
    notes: 'Planned expansion run following initial batch fulfillment.',
    createdAt: '2026-10-15T12:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
  },
];

export async function getAdminStats(): Promise<AdminStats> {
  const [orders, enquiries] = await Promise.all([
    getAllOrders(),
    getAllEnquiries(),
  ]);

  const newEnquiries = enquiries.filter((e) => e.status === 'new').length;
  const awaitingConfirmationOrders = orders.filter((o) => o.status === 'awaiting_confirmation').length;
  const inProductionOrders = orders.filter((o) => o.status === 'in_production').length;
  const dispatchedOrders = orders.filter((o) => o.status === 'dispatched' || o.status === 'delivered').length;
  const totalRevenuePaise = orders
    .filter((o) => !['cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + o.totalPaise, 0);

  return {
    totalEnquiries: enquiries.length,
    newEnquiries,
    totalOrders: orders.length,
    awaitingConfirmationOrders,
    inProductionOrders,
    dispatchedOrders,
    totalRevenuePaise,
    publishedProductsCount: PRODUCTS.length,
  };
}

export async function getAllBatches(): Promise<Batch[]> {
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window === 'undefined') return SAMPLE_BATCHES;
    try {
      const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
      if (!raw) {
        localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(SAMPLE_BATCHES));
        return SAMPLE_BATCHES;
      }
      return JSON.parse(raw);
    } catch {
      return SAMPLE_BATCHES;
    }
  }

  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return SAMPLE_BATCHES;

    return data.map((b: any) => ({
      id: b.id,
      name: b.name,
      targetQuantity: b.target_quantity,
      expectedDispatchDate: b.expected_dispatch_date,
      status: b.status,
      notes: b.notes,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  } catch (err) {
    console.warn('Supabase getAllBatches fallback note:', err);
    return SAMPLE_BATCHES;
  }
}

export async function createBatch(batchData: {
  name: string;
  targetQuantity: number;
  expectedDispatchDate?: string;
  notes?: string;
}): Promise<{ success: boolean; batch?: Batch; error?: string }> {
  const newBatch: Batch = {
    id: `batch-${Date.now()}`,
    name: batchData.name,
    targetQuantity: batchData.targetQuantity,
    expectedDispatchDate: batchData.expectedDispatchDate || null,
    status: 'planned',
    notes: batchData.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const existing = await getAllBatches();
    const updated = [newBatch, ...existing];
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(updated));
    }
    return { success: true, batch: newBatch };
  }

  try {
    const { data, error } = await supabase
      .from('batches')
      .insert({
        name: batchData.name,
        target_quantity: batchData.targetQuantity,
        expected_dispatch_date: batchData.expectedDispatchDate,
        status: 'planned',
        notes: batchData.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      success: true,
      batch: {
        id: data.id,
        name: data.name,
        targetQuantity: data.target_quantity,
        expectedDispatchDate: data.expected_dispatch_date,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not create batch.' };
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(settings: StoreSettings): Promise<{ success: boolean }> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  }
  return { success: true };
}

export async function logAdminAction(action: string, entityType: string, entityId: string, details?: any): Promise<void> {
  const log: AdminAuditLog = {
    id: `audit-${Date.now()}`,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
      const all = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify([log, ...all].slice(0, 50)));
    } catch {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('admin_audit_log').insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });
    } catch {}
  }
}
