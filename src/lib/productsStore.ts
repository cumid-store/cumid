import type { Product, CollectionSlug } from '../types/product';
import { PRODUCTS } from '../data/products';

export interface EditableProduct {
  id: string;
  slug: string;
  name: string;
  collectionName: string;
  collection: CollectionSlug;
  pricePaise: number | null;
  isSoldOut: boolean;
  isPublished: boolean;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  coverImageUrl: string;
  isDesignPreview: boolean;
  availabilityStatus: 'SoldOut' | 'PreOrderEnquiryOnly';
  whatsappEnquiryEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  isNew?: boolean;
  hasUnpublishedChanges?: boolean;
}

export function getAdminNewProducts(): EditableProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cumid_admin_new_products');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAdminDeletedProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cumid_admin_deleted_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAdminProductOverrides(): Record<string, Partial<EditableProduct>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('cumid_admin_product_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function adminProductToStoreProduct(ap: EditableProduct): Product {
  const priceInRupees = ap.pricePaise != null ? Math.round(ap.pricePaise / 100) : null;
  const coverSrc = ap.coverImageUrl || '/products/kal-se-productive/cover.webp';
  return {
    id: ap.id,
    slug: ap.slug,
    name: ap.name,
    tagline: ap.tagline || '',
    shortDescription: ap.shortDescription || '',
    longDescription: ap.longDescription || ap.shortDescription || '',
    collection: ap.collection,
    collectionName: ap.collectionName,
    images: [
      {
        src: coverSrc,
        alt: `${ap.name} cover artwork concept.`,
        isPrimary: true,
      },
    ],
    isDesignPreview: ap.isDesignPreview ?? true,
    confirmedSpecs: {
      format: 'Square pocket diary',
      binding: 'Spiral binding along top edge',
      orientation: 'Top-flip notebook format',
    },
    price: priceInRupees,
    currency: 'INR',
    isSoldOut: ap.isSoldOut ?? true,
    availabilityStatus: ap.availabilityStatus ?? (ap.isSoldOut ? 'SoldOut' : 'PreOrderEnquiryOnly'),
    whatsappEnquiryEnabled: ap.whatsappEnquiryEnabled ?? true,
    seoTitle: ap.seoTitle || `${ap.name} Pocket Diary | CUMID`,
    seoDescription: ap.seoDescription || ap.shortDescription || `${ap.name} square pocket diary by CUMID.`,
    lastMeaningfulUpdate: new Date().toISOString().split('T')[0],
    personalityNote: ap.tagline || '',
  };
}

export function getMergedStoreProducts(baseProducts: Product[] = PRODUCTS): Product[] {
  if (typeof window === 'undefined') return baseProducts;

  const deletedIds = new Set(getAdminDeletedProductIds());
  const overrides = getAdminProductOverrides();
  const modifiedBase = baseProducts
    .filter((p) => !deletedIds.has(p.id))
    .map((p) => {
      const ov = overrides[p.id];
      if (!ov) return p;
      return {
        ...p,
        price: ov.pricePaise != null ? Math.round(ov.pricePaise / 100) : p.price,
        tagline: ov.tagline ?? p.tagline,
        isSoldOut: ov.isSoldOut ?? p.isSoldOut,
        isPublished: ov.isPublished ?? true,
      } as Product;
    }).filter((p: any) => p.isPublished !== false);

  const newAdminProds = getAdminNewProducts()
    .filter((p) => !deletedIds.has(p.id) && p.isPublished !== false)
    .map(adminProductToStoreProduct);

  const baseIds = new Set(modifiedBase.map((p) => p.id));
  const uniqueNew = newAdminProds.filter((p) => !baseIds.has(p.id));

  return [...modifiedBase, ...uniqueNew];
}

export function findProductBySlug(slug: string, baseProducts: Product[] = PRODUCTS): Product | undefined {
  const all = getMergedStoreProducts(baseProducts);
  return all.find((p) => p.slug === slug);
}
