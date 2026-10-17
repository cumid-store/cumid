export type BatchStatus = 'planned' | 'in_production' | 'completed' | 'cancelled';

export interface Batch {
  id: string;
  name: string;
  targetQuantity: number;
  expectedDispatchDate?: string | null;
  status: BatchStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  batchId?: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  updatedAt: string;
}
