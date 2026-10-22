import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import { findProductBySlug } from '../../lib/productsStore';
import { WhatsAppPreorderButton } from './WhatsAppPreorderButton';
import { FavouritesButton } from './FavouritesButton';
import { SITE } from '../../config/site';

export const DynamicProductViewer: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname.replace(/\/+$/, '');
    const match = pathname.match(/^\/products\/([^/]+)$/);

    if (match) {
      const slug = match[1];
      const found = findProductBySlug(slug);
      if (found) {
        setProduct(found);
        document.title = found.seoTitle || `${found.name} Pocket Diary | CUMID`;
      }
    }
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="py-24 text-center text-charcoal-400 text-sm">Loading cover details…</div>;
  }

  // If not a matching product URL, render standard 404
  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 sm:py-32 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-peach-100 text-peach-700 font-semibold text-3xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight">
            Blank page syndrome.
          </h1>
          <p className="text-sm sm:text-base text-charcoal-700 max-w-md mx-auto leading-relaxed">
            The link you followed seems to have flipped past our last page. Don't worry—your favourite covers are still waiting in our shop.
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <a href="/" className="btn-primary text-xs w-full sm:w-auto">
            Return to Home
          </a>
          <a href="/shop" className="btn-secondary text-xs w-full sm:w-auto">
            Explore Pocket Diaries
          </a>
        </div>
        <p className="text-xs text-charcoal-700/60 pt-6">
          Looking for a specific batch? Ask us on WhatsApp:{' '}
          <a href={SITE.whatsappBaseUrl} className="underline font-mono">
            {SITE.whatsappDisplayNumber}
          </a>
        </p>
      </div>
    );
  }

  const coverImg = product.images?.[0]?.src || '/products/kal-se-productive/cover.webp';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-charcoal-600 flex items-center gap-2">
        <a href="/" className="hover:underline">Home</a>
        <span>/</span>
        <a href="/shop" className="hover:underline">Shop</a>
        <span>/</span>
        <a href={`/collections/${product.collection}`} className="hover:underline capitalize">
          {product.collectionName}
        </a>
        <span>/</span>
        <span className="text-charcoal-900 font-semibold">{product.name}</span>
      </nav>

      {/* Product Main Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Product Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-square w-full overflow-hidden bg-ivory-300 p-5 flex items-center justify-center">
            <div className="diary-stage w-full h-full flex items-center justify-center">
              <div className="diary-object" data-diary-object>
                <div className="diary-paper" aria-hidden="true" />
                <img
                  src={coverImg}
                  alt={`${product.name} top-spiral diary concept.`}
                  className="w-full h-full object-contain"
                />
                <div className="diary-binding" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} />
                  ))}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.isDesignPreview && (
                <span className="badge-preview shadow-sm text-xs">Design preview</span>
              )}
            </div>
          </div>

          <p className="text-xs text-charcoal-700/70 italic text-center pt-1">
            Digital diary mockup. Binding colour, materials and finished dimensions are illustrative; final details will be confirmed before ordering.
          </p>
        </div>

        {/* Right Column: Product Detail & Preorder Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between text-xs text-charcoal-700/70 font-semibold tracking-wider uppercase">
            <a href={`/collections/${product.collection}`} className="hover:text-lavender-700 underline underline-offset-2">
              {product.collectionName} Collection
            </a>
            <span className="font-mono text-[11px]">Ref: {product.id}</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight">
              {product.name}
            </h1>
            <p className="text-base text-lavender-700 font-medium">
              {product.tagline}
            </p>
          </div>

          {/* Pricing & Availability */}
          <div className="py-5 border-y border-charcoal-800/15 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal-700 font-medium">Availability:</span>
              <span className={product.isSoldOut ? 'badge-sold-out text-[11px]' : 'text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full'}>
                {product.isSoldOut ? 'Currently Sold Out' : 'Preorders open'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-charcoal-800/5">
              <span className="text-charcoal-700 font-medium">Price:</span>
              <span className="text-charcoal-900 font-semibold font-mono">
                {product.price ? `₹${product.price}` : 'Ask on WhatsApp'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-sm bg-ivory-200 border-l border-charcoal-800/20 text-sm text-charcoal-700 leading-relaxed space-y-1">
            <p className="font-semibold text-charcoal-900">Preorder Notice:</p>
            <p>
              ₹149 per diary + ₹50 shipping per order. Delivery within 14 days of payment confirmation. Send your preorder on WhatsApp; an order is confirmed after payment verification.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <WhatsAppPreorderButton
              product={product}
              ctaPlacement="product_detail"
              showFallbackCopy={true}
            />

            <FavouritesButton
              productId={product.id}
              productName={product.name}
              iconOnly={false}
            />
          </div>

          {/* Specifications */}
          <div className="pt-6 border-t border-charcoal-800/10 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700/70">
              Confirmed Format &amp; Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="py-3 border-b border-charcoal-800/10">
                <dt className="text-charcoal-700/70">Shape &amp; Size</dt>
                <dd className="font-semibold text-charcoal-900 mt-0.5">{product.confirmedSpecs.format}</dd>
              </div>
              <div className="py-3 border-b border-charcoal-800/10">
                <dt className="text-charcoal-700/70">Binding Location</dt>
                <dd className="font-semibold text-charcoal-900 mt-0.5">{product.confirmedSpecs.binding}</dd>
              </div>
              <div className="py-3 border-b border-charcoal-800/10 col-span-2">
                <dt className="text-charcoal-700/70">Writing Orientation</dt>
                <dd className="font-semibold text-charcoal-900 mt-0.5">{product.confirmedSpecs.orientation}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Story & Description */}
      <div className="max-w-3xl pt-8 border-t border-charcoal-800/10 space-y-4">
        <h2 className="text-2xl font-bold text-charcoal-900">
          About this design
        </h2>
        <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed">
          {product.longDescription || product.shortDescription}
        </p>
      </div>

      {/* Return to shop */}
      <div className="pt-8 border-t border-charcoal-800/10 flex items-center justify-between">
        <a href="/shop" className="btn-secondary text-xs">
          ← Back to All Covers
        </a>
        <a href={`/collections/${product.collection}`} className="btn-secondary text-xs capitalize">
          View More {product.collectionName} Covers →
        </a>
      </div>
    </div>
  );
};

export default DynamicProductViewer;
