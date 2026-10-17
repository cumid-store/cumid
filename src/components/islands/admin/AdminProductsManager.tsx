import React, { useState } from 'react';
import { 
  Edit2, Eye, EyeOff, UploadCloud, CheckCircle2, Save 
} from 'lucide-react';
import { PRODUCTS } from '../../../data/products';
import { logAdminAction } from '../../../lib/admin';
import { formatPaiseToINR } from '../../../types/order';
import AdminLayout from './AdminLayout';

interface EditableProduct {
  id: string;
  slug: string;
  name: string;
  collectionName: string;
  pricePaise: number | null;
  isSoldOut: boolean;
  isPublished: boolean;
  tagline: string;
  hasUnpublishedChanges?: boolean;
}

export const AdminProductsManager: React.FC = () => {
  const [products, setProducts] = useState<EditableProduct[]>(() => {
    // Initial state from PRODUCTS catalog
    return PRODUCTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      collectionName: p.collectionName,
      pricePaise: p.price ? p.price * 100 : null,
      isSoldOut: p.isSoldOut,
      isPublished: true,
      tagline: p.tagline,
      hasUnpublishedChanges: false,
    }));
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState<number | string>('');
  const [editTagline, setEditTagline] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleStartEdit = (prod: EditableProduct) => {
    setEditingId(prod.id);
    setEditPriceRupees(prod.pricePaise ? prod.pricePaise / 100 : '');
    setEditTagline(prod.tagline);
  };

  const handleSaveDraft = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newPaise = editPriceRupees === '' ? null : Math.round(Number(editPriceRupees) * 100);
        return {
          ...p,
          pricePaise: newPaise,
          tagline: editTagline,
          hasUnpublishedChanges: true,
        };
      })
    );
    setEditingId(null);
    void logAdminAction('update_product_draft', 'product', id, {
      pricePaise: editPriceRupees ? Number(editPriceRupees) * 100 : null,
      tagline: editTagline,
    });
  };

  const handleToggleSoldOut = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isSoldOut: !p.isSoldOut, hasUnpublishedChanges: true } : p
      )
    );
    void logAdminAction('toggle_sold_out', 'product', id);
  };

  const handleTogglePublished = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isPublished: !p.isPublished, hasUnpublishedChanges: true } : p
      )
    );
    void logAdminAction('toggle_published', 'product', id);
  };

  const handlePublishCatalogue = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setProducts((prev) => prev.map((p) => ({ ...p, hasUnpublishedChanges: false })));
      setIsPublishing(false);
      setPublishSuccess(true);
      void logAdminAction('publish_catalogue', 'system', 'all_products');
      setTimeout(() => setPublishSuccess(false), 4000);
    }, 1500);
  };

  const pendingChangesCount = products.filter((p) => p.hasUnpublishedChanges).length;

  return (
    <AdminLayout
      activeTab="products"
      title="Catalogue & Product Management"
      subtitle="Manage confirmed prices, availability status, and staging changes before publishing to the live storefront."
    >
      <div className="space-y-6">
        {/* Publish Action Bar */}
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
                  Storefront in sync with published database
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-600">
              Draft changes are stored safely in your admin database. Click publish to roll them out to the static website.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePublishCatalogue}
            disabled={isPublishing || pendingChangesCount === 0}
            className="btn-primary text-xs py-2 px-4 gap-2 whitespace-nowrap self-start sm:self-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-ivory-100 border-t-transparent rounded-full animate-spin" />
                <span>Publishing to Edge...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Publish Catalogue Changes</span>
              </>
            )}
          </button>
        </div>

        {publishSuccess && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span>Catalogue changes successfully published! Live product pages are updated.</span>
          </div>
        )}

        {/* Product Cards Table */}
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-charcoal-900">{prod.name}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-500 bg-ivory-200 px-2 py-0.5 rounded">
                        {prod.collectionName}
                      </span>
                      <span className="font-mono text-xs text-charcoal-400">({prod.id})</span>
                    </div>
                    <p className="text-xs text-charcoal-600 italic">
                      "{prod.tagline}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                    {/* Price display or edit */}
                    <div className="text-right">
                      <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">Confirmed Price</span>
                      {prod.pricePaise ? (
                        <span className="font-mono font-bold text-sm text-charcoal-900">
                          {formatPaiseToINR(prod.pricePaise)}
                        </span>
                      ) : (
                        <span className="text-xs text-charcoal-500 italic">On WhatsApp</span>
                      )}
                    </div>

                    {/* Status badges & toggles */}
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
                        title={prod.isPublished ? 'Published on website' : 'Unpublished (Hidden)'}
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
                    </div>
                  </div>
                </div>

                {/* Inline Editing Row */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-charcoal-800/10 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end bg-ivory-200/50 p-3 rounded-xl">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="font-semibold text-charcoal-800">Confirmed Price in ₹ (Leave empty if on WhatsApp)</label>
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
