export type EnquiryStatus = 'new' | 'contacted' | 'quoted' | 'converted' | 'closed';

export interface Enquiry {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status: EnquiryStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
