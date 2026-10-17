import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { getLocalFavourites, toggleLocalFavourite } from '../../lib/supabase';
import { PRODUCTS } from '../../data/products';
import { WhatsAppPreorderButton } from './WhatsAppPreorderButton';

export const FavouritesList: React.FC = () => {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFavouriteIds(getLocalFavourites());

    const handleSync = (e: any) => {
      const list = e.detail?.favourites || getLocalFavourites();
      setFavouriteIds(list);
    };

    window.addEventListener('cumid:favourites-updated', handleSync);
    return () => window.removeEventListener('cumid:favourites-updated', handleSync);
  }, []);

  if (!mounted) {
    return (
      <div className="py-12 text-center text-sm text-charcoal-700">
        Loading saved favourites...
      </div>
    );
  }

  const savedProducts = PRODUCTS.filter((p) => favouriteIds.includes(p.id));

  const handleRemove = (productId: string) => {
    const { favourites } = toggleLocalFavourite(productId);
    setFavouriteIds(favourites);
    window.dispatchEvent(
      new CustomEvent('cumid:favourites-updated', { detail: { favourites } })
    );
  };

  if (savedProducts.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-full bg-peach-100 flex items-center justify-center text-peach-700">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-charcoal-900">No favourites saved yet</h2>
          <p className="text-sm text-charcoal-700">
            Click the heart icon on any pocket diary cover in our catalog to save it here for quick comparison.
          </p>
        </div>
        <div className="pt-2">
          <a href="/shop" className="btn-primary text-xs gap-2">
            <span>Explore all covers</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-charcoal-800/10">
        <p className="text-xs text-charcoal-700">
          You have <strong className="font-semibold text-charcoal-900">{savedProducts.length}</strong> diary {savedProducts.length === 1 ? 'cover' : 'covers'} saved.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {savedProducts.map((product) => (
          <div
            key={product.id}
            className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 flex flex-col justify-between space-y-4 shadow-soft-sm hover:shadow-soft transition-shadow"
          >
            <div className="flex gap-4">
              <a href={`/products/${product.slug}`} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-ivory-200 border border-charcoal-800/10 block">
                <img
                  src={product.images[0]?.src}
                  alt={product.images[0]?.alt}
                  className="w-full h-full object-cover"
                />
              </a>

              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-700/60">
                    {product.collectionName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    aria-label={`Remove ${product.name} from favourites`}
                    className="p-1 text-charcoal-700/60 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a href={`/products/${product.slug}`} className="font-bold text-sm text-charcoal-900 hover:text-lavender-700 block transition-colors">
                  {product.name}
                </a>
                <p className="text-xs text-charcoal-700 line-clamp-2">
                  {product.shortDescription}
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <span className="badge-sold-out text-[10px] py-0.5 px-2">Sold Out</span>
                  <span className="text-[11px] text-charcoal-700/80 italic">Top-spiral pocket format</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-charcoal-800/10">
              <WhatsAppPreorderButton
                product={product}
                ctaPlacement="featured_grid"
                showFallbackCopy={false}
                className="py-2.5 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default FavouritesList;
