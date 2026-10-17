import { getStoredConsent, initializeGA4IfConfigured, trackEvent } from './analytics';
import { PRODUCTS } from '../data/products';
import { FAQ_ITEMS } from '../data/faq';

let viewed = false;
function recordView() {
  if (viewed || getStoredConsent() !== 'granted') return;
  initializeGA4IfConfigured();
  if (typeof (window as any).gtag !== 'function') return;
  viewed = true;
  const product = PRODUCTS.find(p => location.pathname.replace(/\/+$/, '') === `/products/${p.slug}`);
  if (product) trackEvent('view_item', { productId: product.id, collectionId: product.collection });
  else if (/^\/(shop|collections)(\/|$)/.test(location.pathname)) {
    trackEvent('view_item_list', { collectionId: location.pathname.split('/')[2] });
  }
}
recordView();
window.addEventListener('cumid:consent-changed', recordView);
document.addEventListener('click', event => {
  const link = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
  if (!link) return;
  const url = new URL(link.href);
  const product = PRODUCTS.find(p => url.origin === location.origin && url.pathname.replace(/\/+$/, '') === `/products/${p.slug}`);
  if (product) trackEvent('select_item', { productId: product.id, collectionId: product.collection });
  if (link.closest('#collections')) trackEvent('collection_filter', { collectionId: url.pathname.split('/')[2] });
  // Product React buttons already emit their own event.
  if (url.hostname === 'wa.me' && !link.id.startsWith('whatsapp-preorder-')) {
    trackEvent('whatsapp_preorder_click', { ctaPlacement: link.closest('header') ? 'nav' : link.closest('footer') ? 'footer' : 'hero' });
  }
});
document.addEventListener('toggle', event => {
  const detail = event.target as HTMLDetailsElement;
  if (detail.tagName !== 'DETAILS' || !detail.open) return;
  const id = detail.id.replace(/^faq-/, '');
  if (FAQ_ITEMS.some(f => f.id === id)) trackEvent('faq_expand', { faqId: id });
}, true);
