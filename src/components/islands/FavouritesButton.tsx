import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { initializeFavourites, snapshot, toggleFavourite } from '../../lib/favourites';
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
    const sync = () => setIsFav(snapshot().favourites.includes(productId));
    window.addEventListener('cumid:favourites-updated', sync);
    void initializeFavourites().then(sync);
    return () => window.removeEventListener('cumid:favourites-updated', sync);
  }, [productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const added = await toggleFavourite(productId);
      setIsFav(added);
      try { trackEvent(added ? 'add_to_wishlist' : 'remove_from_wishlist', { productId }); } catch {}
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not save this change.');
    } finally { setLoading(false); }
  };

  const label = isFav
    ? `Remove ${productName || 'product'} from favourites`
    : `Save ${productName || 'product'} to favourites`;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
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
        disabled={loading}
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
