import { supabase, isSupabaseConfigured } from './supabase';
import type { Enquiry, EnquiryStatus } from '../types/enquiry';

const LOCAL_ENQUIRIES_KEY = 'cumid_demo_enquiries_v1';

const SAMPLE_DEMO_ENQUIRIES: Enquiry[] = [
  {
    id: 'enq-001',
    productId: 'CUMID-FL-001',
    productName: 'Lavender Bloom',
    quantity: 2,
    customerName: 'Ananya Roy',
    customerPhone: '+91 9820012345',
    customerEmail: 'ananya@example.com',
    status: 'quoted',
    notes: 'Quoted batch #1 pricing on WhatsApp. Awaiting shipping address.',
    createdAt: '2026-10-17T08:30:00Z',
    updatedAt: '2026-10-17T09:15:00Z',
  },
  {
    id: 'enq-002',
    productId: 'CUMID-HG-001',
    productName: 'Kal Se Productive',
    quantity: 1,
    customerName: 'Rohan Mehra',
    customerPhone: '+91 9711098765',
    customerEmail: null,
    status: 'new',
    notes: 'Inquired about dispatch dates for Delhi NCR.',
    createdAt: '2026-10-17T11:00:00Z',
    updatedAt: '2026-10-17T11:00:00Z',
  },
  {
    id: 'enq-003',
    productId: 'CUMID-CJ-002',
    productName: 'Plans in Overdrive',
    quantity: 3,
    customerName: 'Vikram Joshi',
    customerPhone: '+91 9930055443',
    customerEmail: 'vikram.j@example.com',
    status: 'contacted',
    notes: 'Discussed quantity discount inquiry; confirmed single unit batch rate.',
    createdAt: '2026-10-16T15:20:00Z',
    updatedAt: '2026-10-16T16:00:00Z',
  },
];

function getLocalEnquiries(): Enquiry[] {
  if (typeof window === 'undefined') return SAMPLE_DEMO_ENQUIRIES;
  try {
    const raw = localStorage.getItem(LOCAL_ENQUIRIES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(SAMPLE_DEMO_ENQUIRIES));
      return SAMPLE_DEMO_ENQUIRIES;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_DEMO_ENQUIRIES;
  }
}

function saveLocalEnquiries(enquiries: Enquiry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(enquiries));
  } catch (e) {
    console.warn('Could not persist local demo enquiries', e);
  }
}

/**
 * Record a preorder enquiry (called when visitor triggers WhatsApp button or fills details)
 */
export async function logPreorderEnquiry(data: {
  productId: string;
  productName: string;
  quantity: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
}): Promise<{ success: boolean; id?: string }> {
  const newEnquiry: Enquiry = {
    id: `enq-${Date.now()}`,
    productId: data.productId,
    productName: data.productName,
    quantity: data.quantity || 1,
    customerName: data.customerName || null,
    customerPhone: data.customerPhone || null,
    customerEmail: data.customerEmail || null,
    status: 'new',
    notes: data.notes || 'Initiated from product preorder enquiry CTA.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const all = [newEnquiry, ...getLocalEnquiries()];
    saveLocalEnquiries(all);
    return { success: true, id: newEnquiry.id };
  }

  try {
    const { data: dbData, error } = await supabase
      .from('enquiries')
      .insert({
        product_id: data.productId,
        product_name: data.productName,
        quantity: data.quantity || 1,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        status: 'new',
        notes: data.notes,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: dbData.id };
  } catch (err: any) {
    console.warn('Supabase enquiry insertion note:', err);
    const all = [newEnquiry, ...getLocalEnquiries()];
    saveLocalEnquiries(all);
    return { success: true, id: newEnquiry.id };
  }
}

/**
 * Admin: Get all preorder enquiries
 */
export async function getAllEnquiries(statusFilter?: string): Promise<Enquiry[]> {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLocalEnquiries();
    return statusFilter && statusFilter !== 'all'
      ? list.filter((e) => e.status === statusFilter)
      : list;
  }

  try {
    let query = supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('Supabase getAllEnquiries fallback note:', err);
    return getLocalEnquiries();
  }
}

/**
 * Admin: Update enquiry status and notes
 */
export async function updateEnquiryStatus(
  enquiryId: string,
  newStatus: EnquiryStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const list = getLocalEnquiries();
    const idx = list.findIndex((e) => e.id === enquiryId);
    if (idx !== -1) {
      list[idx].status = newStatus;
      if (notes !== undefined) list[idx].notes = notes;
      list[idx].updatedAt = new Date().toISOString();
      saveLocalEnquiries(list);
      return { success: true };
    }
    return { success: false, error: 'Enquiry not found.' };
  }

  try {
    const payload: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) payload.notes = notes;

    const { error } = await supabase
      .from('enquiries')
      .update(payload)
      .eq('id', enquiryId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not update enquiry status.' };
  }
}
