import React, { useState, useRef } from 'react';
import {
  Edit2, Eye, EyeOff, UploadCloud, CheckCircle2, Save,
  Plus, X, Image as ImageIcon, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PRODUCTS } from '../../../data/products';
import { logAdminAction } from '../../../lib/admin';
import { formatPaiseToINR } from '../../../types/order';
import AdminLayout from './AdminLayout';
import type { CollectionSlug } from '../../../types/product';

// ── Helpers & Outside Components ─────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

// Declared at module level so React does not re-mount inputs on every keystroke
const Field: React.FC<FieldProps> = ({ label, required, error, hint, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-charcoal-800">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-charcoal-500">{hint}</p>}
    {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
  </div>
);

const inputCls = (err?: string) =>
  `w-full p-2.5 rounded-xl border text-sm bg-ivory-100 focus:outline-none focus:ring-2 focus:ring-lavender-400 transition ${
    err ? 'border-red-400' : 'border-charcoal-800/15'
  }`;

// Resizes image client-side to ensure base64 data fits safely in localStorage
function resizeImageFile(file: File, maxDimension = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          resolve(dataUrl);
        } catch {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface EditableProduct {
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

interface NewProductForm {
  name: string;
  slug: string;
  collection: CollectionSlug;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  coverImageUrl: string;
  priceRupees: string;
  isSoldOut: boolean;
  isDesignPreview: boolean;
  availabilityStatus: 'SoldOut' | 'PreOrderEnquiryOnly';
  whatsappEnquiryEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
}

const COLLECTIONS: { value: CollectionSlug; label: string }[] = [
  { value: 'floral',       label: 'Floral' },
  { value: 'cute',         label: 'Cute' },
  { value: 'hinglish',     label: 'Hinglish' },
  { value: 'cars-and-jets', label: 'Cars & Jets' },
  { value: 'originals',    label: 'Originals' },
];

const BLANK_FORM: NewProductForm = {
  name: '',
  slug: '',
  collection: 'floral',
  tagline: '',
  shortDescription: '',
  longDescription: '',
  coverImageUrl: '',
  priceRupees: '',
  isSoldOut: true,
  isDesignPreview: true,
  availabilityStatus: 'SoldOut',
  whatsappEnquiryEnabled: true,
  seoTitle: '',
  seoDescription: '',
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateId(collection: CollectionSlug, existingProducts: EditableProduct[]) {
  const prefix: Record<CollectionSlug, string> = {
    floral: 'FL', cute: 'CT', hinglish: 'HG', 'cars-and-jets': 'CJ', originals: 'OR',
  };
  const same = existingProducts.filter((p) => p.collection === collection);
  const num = String(same.length + 1).padStart(3, '0');
  return `CUMID-${prefix[collection]}-${num}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AdminProductsManager: React.FC = () => {
  const [products, setProducts] = useState<EditableProduct[]>(() => {
    let base = PRODUCTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      collectionName: p.collectionName,
      collection: p.collection,
      pricePaise: p.price ? p.price * 100 : null,
      isSoldOut: p.isSoldOut,
      isPublished: true,
      tagline: p.tagline,
      shortDescription: p.shortDescription,
      longDescription: p.longDescription,
      coverImageUrl: p.images.find((i) => i.isPrimary)?.src ?? '',
      isDesignPreview: p.isDesignPreview,
      availabilityStatus: p.availabilityStatus,
      whatsappEnquiryEnabled: p.whatsappEnquiryEnabled,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      hasUnpublishedChanges: false,
    }));
    try {
      const deletedIdsStr = localStorage.getItem('cumid_admin_deleted_ids');
      if (deletedIdsStr) {
        const deletedIds: string[] = JSON.parse(deletedIdsStr);
        const delSet = new Set(deletedIds);
        base = base.filter((p) => !delSet.has(p.id));
      }
    } catch {}

    try {
      const overridesStr = localStorage.getItem('cumid_admin_product_overrides');
      if (overridesStr) {
        const overrides: Record<string, Partial<EditableProduct>> = JSON.parse(overridesStr);
        base = base.map((p) => overrides[p.id] ? { ...p, ...overrides[p.id] } : p);
      }
    } catch {}

    try {
      const stored = localStorage.getItem('cumid_admin_new_products');
      if (stored) {
        const extras: EditableProduct[] = JSON.parse(stored);
        return [...base, ...extras];
      }
    } catch {}
    return base;
  });

  // Existing-product edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState<number | string>('');
  const [editTagline, setEditTagline] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Publish state
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Add-product panel
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewProductForm>(BLANK_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewProductForm, string>>>({});
  const [addSuccess, setAddSuccess] = useState(false);

  function persistAll(all: EditableProduct[]) {
    try {
      const newOnes = all.filter((p) => p.isNew);
      localStorage.setItem('cumid_admin_new_products', JSON.stringify(newOnes));

      const existingOnes = all.filter((p) => !p.isNew);
      const remainingIds = new Set(existingOnes.map((p) => p.id));
      const deletedBaseIds = PRODUCTS.filter((p) => !remainingIds.has(p.id)).map((p) => p.id);
      localStorage.setItem('cumid_admin_deleted_ids', JSON.stringify(deletedBaseIds));

      const overrides: Record<string, Partial<EditableProduct>> = {};
      for (const p of existingOnes) {
        overrides[p.id] = {
          pricePaise: p.pricePaise,
          tagline: p.tagline,
          isSoldOut: p.isSoldOut,
          isPublished: p.isPublished,
        };
      }
      localStorage.setItem('cumid_admin_product_overrides', JSON.stringify(overrides));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cumid:catalogue-updated'));
      }
    } catch {}
  }

  // ── Existing product handlers ────────────────────────────────────────────

  const handleStartEdit = (prod: EditableProduct) => {
    setEditingId(prod.id);
    setEditPriceRupees(prod.pricePaise ? prod.pricePaise / 100 : '');
    setEditTagline(prod.tagline);
  };

  const handleSaveDraft = (id: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const newPaise = editPriceRupees === '' ? null : Math.round(Number(editPriceRupees) * 100);
        return { ...p, pricePaise: newPaise, tagline: editTagline, hasUnpublishedChanges: true };
      });
      persistAll(next);
      return next;
    });
    setEditingId(null);
    void logAdminAction('update_product_draft', 'product', id, {
      pricePaise: editPriceRupees ? Number(editPriceRupees) * 100 : null,
      tagline: editTagline,
    });
  };

  const handleToggleSoldOut = (id: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, isSoldOut: !p.isSoldOut, hasUnpublishedChanges: true } : p);
      persistAll(next);
      return next;
    });
    void logAdminAction('toggle_sold_out', 'product', id);
  };

  const handleTogglePublished = (id: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, isPublished: !p.isPublished, hasUnpublishedChanges: true } : p);
      persistAll(next);
      return next;
    });
    void logAdminAction('toggle_published', 'product', id);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistAll(next);
      return next;
    });
    setConfirmDeleteId(null);
    void logAdminAction('delete_product', 'product', id);
  };

  const handlePublishCatalogue = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setProducts((prev) => {
        const next = prev.map((p) => ({ ...p, hasUnpublishedChanges: false }));
        persistAll(next);
        return next;
      });
      setIsPublishing(false);
      setPublishSuccess(true);
      void logAdminAction('publish_catalogue', 'system', 'all_products');
      setTimeout(() => setPublishSuccess(false), 4000);
    }, 1200);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    setImageLoading(true);
    setImageError(null);

    try {
      const dataUrl = await resizeImageFile(file);
      setField('coverImageUrl', dataUrl);
    } catch {
      setImageError('Failed to process image. Please try another file.');
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Add-product form handlers ────────────────────────────────────────────

  const setField = <K extends keyof NewProductForm>(key: K, value: NewProductForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name') {
        const valStr = value as string;
        // Auto-generate slug if it wasn't manually altered
        if (!prev.slug || prev.slug === toSlug(prev.name)) {
          next.slug = toSlug(valStr);
        }
        // Auto-fill SEO title if it wasn't manually altered
        if (!prev.seoTitle || prev.seoTitle === `${prev.name} Pocket Diary | CUMID`) {
          next.seoTitle = valStr ? `${valStr} Pocket Diary | CUMID` : '';
        }
      }
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewProductForm, string>> = {};
    if (!form.name.trim())             errors.name = 'Product name is required';
    if (!form.slug.trim())             errors.slug = 'URL slug is required';
    if (!form.tagline.trim())          errors.tagline = 'Tagline is required';
    if (!form.shortDescription.trim()) errors.shortDescription = 'Short description is required';
    if (!form.seoTitle.trim())         errors.seoTitle = 'SEO title is required';
    if (!form.seoDescription.trim())   errors.seoDescription = 'SEO description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddProduct = () => {
    if (!validateForm()) return;
    const collectionLabel = COLLECTIONS.find((c) => c.value === form.collection)?.label ?? form.collection;
    const newProduct: EditableProduct = {
      id: generateId(form.collection, products),
      slug: form.slug,
      name: form.name,
      collectionName: collectionLabel,
      collection: form.collection,
      pricePaise: form.priceRupees ? Math.round(Number(form.priceRupees) * 100) : null,
      isSoldOut: form.isSoldOut,
      isPublished: true,
      tagline: form.tagline,
      shortDescription: form.shortDescription,
      longDescription: form.longDescription || form.shortDescription,
      coverImageUrl: form.coverImageUrl,
      isDesignPreview: form.isDesignPreview,
      availabilityStatus: form.availabilityStatus,
      whatsappEnquiryEnabled: form.whatsappEnquiryEnabled,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      isNew: true,
      hasUnpublishedChanges: true,
    };

    setProducts((prev) => {
      const next = [...prev, newProduct];
      persistAll(next);
      return next;
    });

    void logAdminAction('add_product', 'product', newProduct.id, { name: newProduct.name });
    setForm(BLANK_FORM);
    setFormErrors({});
    setImageError(null);
    setAddSuccess(true);
    setShowAddForm(false);
    setTimeout(() => setAddSuccess(false), 4000);
  };

  const pendingChangesCount = products.filter((p) => p.hasUnpublishedChanges).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      activeTab="products"
      title="Catalogue & Product Management"
      subtitle="Add new products, manage prices, availability status, and publish changes to the storefront."
    >
      <div className="space-y-6">

        {/* ── Top action bar ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-charcoal-900">Catalogue Staging Status</span>
              {pendingChangesCount > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingChangesCount} draft changes pending
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
                  Storefront in sync
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-600">
              Draft changes are stored safely. Click publish to roll them out to the live storefront.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="btn-secondary text-xs py-2 px-4 gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
              {showAddForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={handlePublishCatalogue}
              disabled={isPublishing || pendingChangesCount === 0}
              className="btn-primary text-xs py-2 px-4 gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-ivory-100 border-t-transparent rounded-full animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Success banners ── */}
        {publishSuccess && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span>Catalogue changes successfully published! Live product pages are updated.</span>
          </div>
        )}
        {addSuccess && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span>New product added to catalogue and saved. Publish when ready to go live.</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ADD PRODUCT FORM
        ══════════════════════════════════════════════ */}
        {showAddForm && (
          <div className="p-5 sm:p-6 rounded-2xl bg-ivory-100 border-2 border-lavender-300 shadow-soft space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Add New Product</h3>
                <p className="text-xs text-charcoal-500 mt-0.5">Fill in all required fields. The product will be saved as a draft until you publish.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm(BLANK_FORM); setFormErrors({}); }}
                className="p-1.5 rounded-lg hover:bg-ivory-300 text-charcoal-600 transition-colors"
                aria-label="Close add product form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Section 1: Identity ── */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-lavender-700 border-b border-lavender-200 pb-1">
                Product Identity
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Field label="Product Name" required error={formErrors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Midnight Garden"
                    className={inputCls(formErrors.name)}
                  />
                </Field>

                <Field label="URL Slug" required error={formErrors.slug} hint="Auto-filled from name. Used in /products/[slug]">
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setField('slug', toSlug(e.target.value))}
                    placeholder="e.g. midnight-garden"
                    className={inputCls(formErrors.slug)}
                  />
                </Field>

                <Field label="Collection" required>
                  <select
                    value={form.collection}
                    onChange={(e) => setField('collection', e.target.value as CollectionSlug)}
                    className={inputCls()}
                  >
                    {COLLECTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Tagline / Personality Note" required error={formErrors.tagline} hint="Short hook e.g. 'For your late-night notes.'">
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => setField('tagline', e.target.value)}
                    placeholder="e.g. For your late-night notes."
                    className={inputCls(formErrors.tagline)}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section 2: Cover Image ── */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-lavender-700 border-b border-lavender-200 pb-1">
                Cover Image
              </p>
              <div className="pt-2">
                {/* Hidden local file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-ivory-200/40 p-3.5 rounded-2xl border border-charcoal-800/10">
                  {/* Square Image Box / Icon Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-28 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all group shrink-0 cursor-pointer ${
                      form.coverImageUrl
                        ? 'border-lavender-400 bg-ivory-100 shadow-xs'
                        : 'border-charcoal-800/20 bg-ivory-100 hover:border-lavender-500 hover:bg-lavender-50/50'
                    }`}
                    title="Click square icon to upload image from local files"
                    aria-label="Upload product cover image"
                  >
                    {form.coverImageUrl ? (
                      <>
                        <img
                          src={form.coverImageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-charcoal-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-ivory-100 p-2 text-center">
                          <UploadCloud className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-semibold">Change</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-charcoal-500 group-hover:text-lavender-700 transition-colors">
                        {imageLoading ? (
                          <div className="w-6 h-6 border-2 border-lavender-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-ivory-200/80 border border-charcoal-800/10 flex items-center justify-center mb-1 shadow-xs group-hover:scale-105 transition-transform">
                              <ImageIcon className="w-5 h-5 text-charcoal-600 group-hover:text-lavender-600" />
                            </div>
                            <span className="text-[10px] font-semibold text-charcoal-700 group-hover:text-lavender-700">Choose Image</span>
                            <span className="text-[9px] text-charcoal-400">Click to browse</span>
                          </>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Info & action buttons */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-charcoal-800">Upload Product Cover Image</span>
                      {form.coverImageUrl && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Image Attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-600 leading-relaxed">
                      Click the square image box above to select an image file from your computer (PNG, JPG, WEBP).
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-lavender-700 hover:text-lavender-900 underline underline-offset-2 flex items-center gap-1"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{form.coverImageUrl ? 'Change image file…' : 'Browse from device…'}</span>
                      </button>
                      {form.coverImageUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setField('coverImageUrl', '');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                    {imageError && (
                      <p className="text-xs text-red-600 font-medium pt-1">{imageError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Descriptions ── */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-lavender-700 border-b border-lavender-200 pb-1">
                Descriptions
              </p>
              <div className="space-y-3 pt-2">
                <Field label="Short Description" required error={formErrors.shortDescription} hint="1–2 sentences shown on collection and shop pages.">
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => setField('shortDescription', e.target.value)}
                    placeholder="e.g. Deep teal botanicals and twilight-blue florals on an inky background."
                    className={inputCls(formErrors.shortDescription)}
                  />
                </Field>

                <Field label="Long Description" hint="Full description for the product detail page. Leave blank to use the short description.">
                  <textarea
                    value={form.longDescription}
                    onChange={(e) => setField('longDescription', e.target.value)}
                    rows={3}
                    placeholder="Full description shown on the product page…"
                    className={`${inputCls()} resize-y`}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section 4: Pricing & Availability ── */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-lavender-700 border-b border-lavender-200 pb-1">
                Pricing & Availability
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Field label="Confirmed Price (₹)" hint="Leave empty if price is on WhatsApp only.">
                  <input
                    type="number"
                    min={0}
                    value={form.priceRupees}
                    onChange={(e) => setField('priceRupees', e.target.value)}
                    placeholder="e.g. 499"
                    className={inputCls()}
                  />
                </Field>

                <Field label="Availability Status">
                  <select
                    value={form.availabilityStatus}
                    onChange={(e) => setField('availabilityStatus', e.target.value as 'SoldOut' | 'PreOrderEnquiryOnly')}
                    className={inputCls()}
                  >
                    <option value="SoldOut">Sold Out</option>
                    <option value="PreOrderEnquiryOnly">Pre-Order Enquiry Only</option>
                  </select>
                </Field>

                <div className="flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.isSoldOut}
                      onChange={(e) => setField('isSoldOut', e.target.checked)}
                      className="w-4 h-4 accent-lavender-600"
                    />
                    <span className="text-charcoal-800 font-medium">Mark as Sold Out</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.isDesignPreview}
                      onChange={(e) => setField('isDesignPreview', e.target.checked)}
                      className="w-4 h-4 accent-lavender-600"
                    />
                    <span className="text-charcoal-800 font-medium">Design Preview</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.whatsappEnquiryEnabled}
                      onChange={(e) => setField('whatsappEnquiryEnabled', e.target.checked)}
                      className="w-4 h-4 accent-lavender-600"
                    />
                    <span className="text-charcoal-800 font-medium">WhatsApp Enquiry</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Section 5: SEO ── */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-lavender-700 border-b border-lavender-200 pb-1">
                SEO
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Field label="SEO Title" required error={formErrors.seoTitle} hint="Shown in browser tab and Google. Auto-filled from name.">
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setField('seoTitle', e.target.value)}
                    placeholder="e.g. Midnight Garden Pocket Diary | CUMID"
                    className={inputCls(formErrors.seoTitle)}
                  />
                </Field>

                <Field label="SEO Description" required error={formErrors.seoDescription} hint="1–2 sentences for search engine results. ~150 characters.">
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => setField('seoDescription', e.target.value)}
                    rows={2}
                    placeholder="Deep teal botanicals on a pocket diary. Square top-spiral format by CUMID."
                    className={`${inputCls(formErrors.seoDescription)} resize-none`}
                  />
                  <p className="text-[10px] text-charcoal-400 text-right">{form.seoDescription.length} / 160</p>
                </Field>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal-800/10">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm(BLANK_FORM); setFormErrors({}); }}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProduct}
                className="btn-primary text-xs py-2 px-5 gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Catalogue</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            PRODUCT CARDS LIST
        ══════════════════════════════════════════════ */}
        <div className="space-y-3">
          {products.map((prod) => {
            const isEditing = editingId === prod.id;

            return (
              <div
                key={prod.id}
                className={`p-4 sm:p-5 rounded-2xl bg-ivory-100 border transition-all ${
                  prod.hasUnpublishedChanges
                    ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                    : 'border-charcoal-800/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Cover thumbnail */}
                    {prod.coverImageUrl ? (
                      <img
                        src={prod.coverImageUrl}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover bg-ivory-300 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-ivory-300 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-charcoal-400" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-charcoal-900">{prod.name}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-500 bg-ivory-200 px-2 py-0.5 rounded">
                          {prod.collectionName}
                        </span>
                        <span className="font-mono text-[10px] text-charcoal-400">({prod.id})</span>
                        {prod.isNew && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700 border border-lavender-300">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-600 italic">"{prod.tagline}"</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                    {/* Price */}
                    <div className="text-right">
                      <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">Price</span>
                      {prod.pricePaise ? (
                        <span className="font-mono font-bold text-sm text-charcoal-900">
                          {formatPaiseToINR(prod.pricePaise)}
                        </span>
                      ) : (
                        <span className="text-xs text-charcoal-500 italic">On WhatsApp</span>
                      )}
                    </div>

                    {/* Status & actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSoldOut(prod.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          prod.isSoldOut
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                        title="Click to toggle availability"
                      >
                        {prod.isSoldOut ? 'Sold Out' : 'Ready Stock'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublished(prod.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          prod.isPublished
                            ? 'bg-ivory-200 text-charcoal-700 border-charcoal-800/10 hover:text-charcoal-900'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                        title={prod.isPublished ? 'Published' : 'Hidden'}
                      >
                        {prod.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => isEditing ? setEditingId(null) : handleStartEdit(prod)}
                        className="btn-secondary text-[11px] py-1 px-2.5 gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{isEditing ? 'Close' : 'Edit'}</span>
                      </button>

                      {confirmDeleteId === prod.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded-xl px-2 py-1 shadow-xs animate-in fade-in">
                          <span className="text-[11px] font-bold text-red-700">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="px-2 py-0.5 rounded-lg bg-red-600 text-ivory-100 hover:bg-red-700 text-[10px] font-bold transition-colors shadow-xs cursor-pointer"
                            title="Confirm and delete product"
                          >
                            Yes, remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 rounded-lg text-charcoal-500 hover:bg-ivory-200 text-[10px] transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(prod.id)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Remove this product from catalogue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline edit */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-charcoal-800/10 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end bg-ivory-200/50 p-3 rounded-xl">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="font-semibold text-charcoal-800">Confirmed Price ₹ (empty = on WhatsApp)</label>
                      <input
                        type="number"
                        min={0}
                        value={editPriceRupees}
                        onChange={(e) => setEditPriceRupees(e.target.value)}
                        placeholder="e.g. 499"
                        className="w-full p-2 rounded-lg border border-charcoal-800/20 bg-ivory-100 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-6 space-y-1">
                      <label className="font-semibold text-charcoal-800">Tagline / Short Hook</label>
                      <input
                        type="text"
                        value={editTagline}
                        onChange={(e) => setEditTagline(e.target.value)}
                        className="w-full p-2 rounded-lg border border-charcoal-800/20 bg-ivory-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleSaveDraft(prod.id)}
                        className="btn-primary w-full text-xs py-2 justify-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Draft</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProductsManager;
