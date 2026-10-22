import type { APIRoute } from 'astro';
import { PRODUCTS } from '../data/products';
import { COLLECTION_LIST } from '../data/collections';
import { JOURNAL_ARTICLES } from '../data/journal';
import { SITE } from '../config/site';

export const GET: APIRoute = async () => {
  const staticRoutes = [
    '',
    '/shop',
    '/about',
    '/how-preorders-work',
    '/faq',
    '/contact',
    '/careers',
    '/journal',
    '/privacy',
    '/terms',
    '/shipping',
    '/returns-cancellations',
    '/accessibility',
  ];

  const collectionRoutes = COLLECTION_LIST.map((c) => `/collections/${c.slug}`);
  const productRoutes = PRODUCTS.map((p) => `/products/${p.slug}`);
  const journalRoutes = JOURNAL_ARTICLES.map((j) => `/journal/${j.slug}`);

  const allUrls = [
    ...staticRoutes,
    ...collectionRoutes,
    ...productRoutes,
    ...journalRoutes,
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${SITE.canonicalUrl}${url}</loc>
    <changefreq>${url === '' || url === '/shop' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${url === '' ? '1.0' : url.startsWith('/products') ? '0.8' : '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
