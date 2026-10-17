export interface AdminAuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any> | null;
  createdAt: string;
}

export interface StoreSettings {
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  defaultShippingPaise: number;
  freeShippingThresholdPaise?: number;
  estimatedDeliveryDays: string;
  enquiryRetentionDays: number;
  accountRetentionDays: number;
  returnWindowDays: number;
}

export interface AdminStats {
  totalEnquiries: number;
  newEnquiries: number;
  totalOrders: number;
  awaitingConfirmationOrders: number;
  inProductionOrders: number;
  dispatchedOrders: number;
  totalRevenuePaise: number;
  publishedProductsCount: number;
}
