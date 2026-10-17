import { CONSENT_STORAGE_KEY, type ConsentStatus, type TrackedEvent, type AnalyticsEventParams } from '../config/analytics';
import { PRODUCTS } from '../data/products';
import { JOURNAL_ARTICLES } from '../data/journal';
import { FAQ_ITEMS } from '../data/faq';
import { SITE } from '../config/site';

const measurementId = import.meta.env.PUBLIC_GA4_MEASUREMENT_ID;
let memoryConsent: ConsentStatus | undefined;
const privatePage = () => /^\/(account|auth)(\/|$)/.test(location.pathname);

export function getStoredConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';
  if (memoryConsent) return memoryConsent;
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : 'pending';
  } catch { return 'pending'; }
}
export function setStoredConsent(status: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  memoryConsent = status;
  try { localStorage.setItem(CONSENT_STORAGE_KEY, status); } catch { /* In-memory choice still applies. */ }
  window.dispatchEvent(new CustomEvent('cumid:consent-changed', { detail: { status } }));
  if (status === 'granted') initializeGA4IfConfigured();
  else {
    const w = window as any;
    w[`ga-disable-${measurementId}`] = true;
    w.dataLayer = [];
    removeGA4Cookies();
    // Reload unloads executed vendor listeners/timers. Saved denial prevents reloading GA.
    if (w.__cumid_ga4_loaded) window.location.reload();
  }
}
function removeGA4Cookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!/^(_ga|_gid)/.test(name)) continue;
    const domains = location.hostname.split('.');
    const expiry = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = expiry;
    while (domains.length > 1) {
      document.cookie = `${expiry}; domain=${domains.join('.')}`;
      document.cookie = `${expiry}; domain=.${domains.join('.')}`;
      domains.shift();
    }
  }
}
export function getSanitizedPath(): string {
  if (typeof window === 'undefined') return '';
  const known = new Set(['/', '/shop', '/about', '/faq', '/contact', '/journal', '/privacy', '/terms', '/shipping', '/returns-cancellations', '/accessibility', '/how-preorders-work',
    ...PRODUCTS.map(p => '/products/' + p.slug),
    ...SITE.themes.map(t => '/collections/' + t.slug),
    ...JOURNAL_ARTICLES.map(a => '/journal/' + a.slug)]);
  const path = location.pathname.replace(/\/+$/, '') || '/';
  return known.has(path) ? path : '/404';
}
// Allowlist values: arbitrary UTM values can contain personal information.
const campaigns: Record<string, readonly string[]> = {
  utm_source: ['instagram', 'whatsapp'],
  utm_medium: ['social', 'organic', 'referral'],
  utm_campaign: ['launch', 'cover-test'],
};
export function getAllowedCampaignParams(): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof window === 'undefined') return result;
  const query = new URLSearchParams(location.search);
  for (const [key, values] of Object.entries(campaigns)) {
    const value = query.get(key);
    if (value && values.includes(value)) result[key] = value;
  }
  return result;
}
export function initializeGA4IfConfigured(): void {
  if (typeof window === 'undefined' || privatePage()) return;
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || getStoredConsent() !== 'granted') return;
  const w = window as any;
  if (w.__cumid_ga4_loaded) return;
  w.__cumid_ga4_loaded = true;
  w[`ga-disable-${measurementId}`] = false;
  w.dataLayer = w.dataLayer || [];
  // Google's gtag queue expects Arguments objects.
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
  w.gtag('js', new Date());
  w.gtag('config', measurementId, {
    allow_google_signals: false, allow_ad_personalization_signals: false,
    send_page_view: false,
    page_location: SITE.canonicalUrl + getSanitizedPath(),
    page_referrer: '', ignore_referrer: true,
  });
  w.gtag('event', 'page_view', {
    page_location: SITE.canonicalUrl + getSanitizedPath(), page_referrer: '',
    ...getAllowedCampaignParams(),
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}
export function trackEvent(eventName: TrackedEvent, params: AnalyticsEventParams = {}): void {
  if (typeof window === 'undefined' || privatePage() || getStoredConsent() !== 'granted') return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;
  const payload: Record<string, string> = {
    page_location: SITE.canonicalUrl + getSanitizedPath(), page_referrer: '',
    ...getAllowedCampaignParams(),
  };
  if (params.productId && PRODUCTS.some(p => p.id === params.productId)) payload.item_id = params.productId;
  if (params.collectionId && SITE.themes.some(t => t.id === params.collectionId)) payload.item_category = params.collectionId;
  if (params.ctaPlacement && ['hero', 'featured_grid', 'product_gallery', 'product_detail', 'footer', 'nav', 'faq'].includes(params.ctaPlacement)) payload.cta_placement = params.ctaPlacement;
  if (params.faqId && FAQ_ITEMS.some(f => f.id === params.faqId)) payload.faq_id = params.faqId;
  gtag('event', eventName, payload);
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_STORAGE_KEY) {
      memoryConsent = undefined;
      setStoredConsent(event.newValue === 'granted' ? 'granted' : 'denied');
    }
  });
}

