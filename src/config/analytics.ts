/**
 * CUMID Store — Privacy-First Analytics Configuration & Event Dictionary
 */

export type ConsentStatus = 'granted' | 'denied' | 'pending';

export const CONSENT_STORAGE_KEY = 'cumid_analytics_consent_v1';

export const ALLOWED_CAMPAIGN_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export interface AnalyticsEventParams {
  productId?: string;
  collectionId?: string;
  ctaPlacement?: 'hero' | 'featured_grid' | 'product_gallery' | 'product_detail' | 'footer' | 'nav' | 'faq';
  pagePath?: string;
  filterValue?: string;
  faqId?: string;
}

export type TrackedEvent =
  | 'view_item_list'
  | 'select_item'
  | 'view_item'
  | 'collection_filter'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'whatsapp_preorder_click'
  | 'faq_expand';
