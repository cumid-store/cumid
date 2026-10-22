import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import { getMergedStoreProducts } from '../../lib/productsStore';
import { FavouritesButton } from './FavouritesButton';

interface Props {
  initialProducts: Product[];
  collectionSlug?: string;
  collectionName?: string;
  isFeatured?: boolean;
}

export const CatalogueGrid: React.FC<Props> = ({
  initialProducts,
  collectionSlug,
  isFeatured = false,
}) => {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return initialProducts;
    const all = getMergedStoreProducts(initialProducts);
    if (collectionSlug) {
      return all.filter((p) => p.collection === collectionSlug);
    }
    if (isFeatured) {
      return all.slice(0, 6);
    }
    return all;
  });

  useEffect(() => {
    const sync = () => {
      const all = getMergedStoreProducts(initialProducts);
      let filtered = all;
      if (collectionSlug) {
        filtered = all.filter((p) => p.collection === collectionSlug);
      } else if (isFeatured) {
        filtered = all.slice(0, 6);
      }
      setProducts(filtered);

      // Dynamically update counter text in headers/navbars if present on page
      try {
        const allCount = all.length;
        const allCoversLink = document.querySelector('#collections a[href="/shop"], #all-covers-link');
        if (allCoversLink) {
          allCoversLink.textContent = `All covers (${allCount})`;
        }
        const homeAllCovers = document.querySelector('#home-all-covers-link');
        if (homeAllCovers) {
          homeAllCovers.textContent = `All ${allCount} covers ↗`;
        }
        if (collectionSlug) {
          const colHeading = document.querySelector('#collection-count-heading');
          if (colHeading) {
            colHeading.textContent = `Cover designs (${filtered.length})`;
          }
        }
      } catch {}
    };

    sync();
    window.addEventListener('cumid:catalogue-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cumid:catalogue-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [initialProducts, collectionSlug, isFeatured]);

  return (
    <div className="cover-grid">
      {products.map((product) => {
        const coverImg = product.images?.[0]?.src || '/products/kal-se-productive/cover.webp';
        return (
          <article key={product.id} className="product-card">
            <div className="product-art">
              <a href={`/products/${product.slug}`} aria-label={`View ${product.name} pocket diary details`}>
                <div className="diary-stage">
                  <div className="diary-object" data-diary-object>
                    <div className="diary-paper" aria-hidden="true" />
                    <img
                      src={coverImg}
                      alt={`${product.name} square top-spiral diary mockup.`}
                      width={600}
                      height={600}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="diary-binding" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, i) => (
                        <span key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </a>
              <div className="product-save">
                <FavouritesButton productId={product.id} productName={product.name} iconOnly={true} />
              </div>
            </div>

            <div className="product-meta">
              <span>
                {product.collectionName}
              </span>
              <span className="badge-sold-out">
                View availability
              </span>
            </div>

            <h3>
              <a href={`/products/${product.slug}`}>{product.name}</a>
            </h3>
            <p>{product.tagline}</p>
            <a className="product-details" href={`/products/${product.slug}`}>
              View cover &amp; enquire <span aria-hidden="true">↗</span>
            </a>
          </article>
        );
      })}
    </div>
  );
};

export default CatalogueGrid;
