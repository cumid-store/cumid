/**
 * CUMID Store — Product Type Definition
 * Adheres strictly to the verified business model:
 * - Made-to-order availability is distinct from ready stock
 * - Nullable confirmed price
 * - Design preview flag
 * - Strictly confirmed specs (unknown specifications are omitted, never guessed)
 */

export type CollectionSlug = 'floral' | 'cute' | 'hinglish' | 'cars-and-jets' | 'originals';

export interface ConfirmedSpecifications {
  format: string; // e.g., "Square pocket diary"
  binding: string; // e.g., "Spiral binding along top edge"
  orientation: string; // e.g., "Top-flip"
  coverFinish?: string; // Only if confirmed by owner
  pageType?: string; // Only if confirmed by owner
  // Note: GSM, exact dimensions, and page counts are owner-confirmed inputs and not fabricated
}

export interface ProductImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
}

export interface Product {
  id: string; // Stable ID e.g. "CUMID-FL-001"
  slug: string; // URL slug e.g. "lavender-bloom"
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  collection: CollectionSlug;
  collectionName: string;
  images: ProductImage[];
  isDesignPreview: boolean; // Flag indicating concept/design preview
  confirmedSpecs: ConfirmedSpecifications;
  price: number | null; // Nullable; null means "Pricing will be confirmed on WhatsApp"
  currency: 'INR';
  isSoldOut: boolean; // True only when preorders are unavailable
  availabilityStatus: 'SoldOut' | 'PreOrderEnquiryOnly' | 'PreOrder';
  whatsappEnquiryEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  lastMeaningfulUpdate: string; // ISO date string e.g. "2026-10-15"
  personalityNote: string;
}
