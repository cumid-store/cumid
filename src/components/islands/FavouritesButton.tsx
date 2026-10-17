import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { getLocalFavourites, toggleLocalFavourite, supabase, isSupabaseConfigured } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';

interface Props {
  productId: string;
  productName?: string;
  iconOnly?: boolean;
  className?: string;
}

export const FavouritesButton: React.FC<Props> = ({
  productId,
  productName,
  iconOnly = true,
  className = '',
}) => {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initial check from local storage
    const list = getLocalFavourites();
    setIsFav(list.includes(productId));

    const handleSync = (e: any) => {
      const updated = e.detail?.favourites || getLocalFavourites();
      setIsFav(updated.includes(productId));
    };

    window.addEventListener('cumid:favourites-updated', handleSync);
    return () => window.removeEventListener('cumid:favourites-updated', handleSync);
  }, [productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const { isFavourite, favourites } = toggleLocalFavourite(productId);
    setIsFav(isFavourite);

    // Track analytics event if consent granted
    try {
      trackEvent(isFavourite ? 'add_to_wishlist' : 'remove_from_wishlist', {
        productId,
      });
    } catch {}

    // Dispatch custom event for real-time app-wide sync
    window.dispatchEvent(
      new CustomEvent('cumid:favourites-updated', {
        detail: { favourites, productId, isFavourite },
      })
    );

    // Attempt Supabase sync if user is authenticated and configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isFavourite) {
            await supabase.from('favourites').insert({
              user_id: session.user.id,
              product_id: productId,
            });
          } else {
            await supabase
              .from('favourites')
              .delete()
              .eq('user_id', session.user.id)
              .eq('product_id', productId);
          }
        }
      } catch (err) {
        // Silently degrade; local storage already preserved user action
        console.warn('Supabase favourites sync note:', err);
      }
    }

    setLoading(false);
  };

  const label = isFav
    ? `Remove ${productName || 'product'} from favourites`
    : `Save ${productName || 'product'} to favourites`;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        aria-pressed={isFav}
        title={label}
        className={`p-2.5 rounded-full transition-all duration-200 border ${
          isFav
            ? 'bg-peach-100 border-peach-300 text-peach-700'
            : 'bg-ivory-100/90 border-charcoal-800/10 text-charcoal-700 hover:text-charcoal-900 hover:bg-ivory-300'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600 ${className}`}
      >
        <Heart
          className={`w-4 h-4 transition-transform duration-200 ${isFav ? 'fill-peach-600 scale-110' : ''}`}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      aria-pressed={isFav}
      className={`btn-secondary gap-2 w-full ${className}`}
    >
      <Heart
        className={`w-4 h-4 transition-transform ${isFav ? 'fill-peach-600 text-peach-600 scale-110' : ''}`}
        aria-hidden="true"
      />
      <span>{isFav ? 'Saved to favourites' : 'Save to favourites'}</span>
    </button>
  );
};
export default FavouritesButton;
