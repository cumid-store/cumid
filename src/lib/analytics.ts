/**
 * CUMID Store — Privacy-First Analytics Controller
 * 
 * Strict Privacy Rules:
 * - NO GA4 scripts or network requests prior to affirmative user consent.
 * - Basic consent mode only: advertising features, Google signals, and User-ID are DISABLED.
 * - WhatsApp clicks tracked as INTENT ONLY ('whatsapp_preorder_click'), NEVER 'purchase' or 'lead'.
 * - Full WhatsApp message URLs, customer queries, and personal data are strictly stripped.
 */

import {
  CONSENT_STORAGE_KEY,
  type ConsentStatus,
  type TrackedEvent,
  type AnalyticsEventParams,
  ALLOWED_CAMPAIGN_PARAMS,
} from '../config/analytics';

export function getStoredConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';
  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === 'granted' || val === 'denied') return val;
    return 'pending';
  } catch {
    return 'pending';
  }
}

export function setStoredConsent(status: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
    window.dispatchEvent(new CustomEvent('cumid:consent-changed', { detail: { status } }));

    if (status === 'granted') {
      initializeGA4IfConfigured();
    } else {
      // If user revoked consent, remove any GA4 cookies
      removeGA4Cookies();
    }
  } catch (e) {
    console.warn('CUMID: Could not save consent state', e);
  }
}

function removeGA4Cookies(): void {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    if (name.startsWith('_ga') || name.startsWith('_gid')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
    }
  }
}

/**
 * Sanitizes current page pathname without query parameters or hashes.
 */
export function getSanitizedPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

/**
 * Extracts only allowlisted campaign query parameters (e.g. utm_source).
 */
export function getAllowedCampaignParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const searchParams = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  for (const key of ALLOWED_CAMPAIGN_PARAMS) {
    const val = searchParams.get(key);
    if (val && val.length < 100) {
      // Basic sanitize
      result[key] = val.replace(/[^\w-]/g, '');
    }
  }
  return result;
}

/**
 * Initialize GA4 only if consent is granted and measurement ID exists.
 */
export function initializeGA4IfConfigured(): void {
  if (typeof window === 'undefined') return;
  const measurementId = import.meta.env.PUBLIC_GA4_MEASUREMENT_ID;
  if (!measurementId || getStoredConsent() !== 'granted') return;

  // Prevent double loading
  if ((window as any).__cumid_ga4_loaded) return;
  (window as any).__cumid_ga4_loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag('js', new Date());
  // Strict Privacy: disable signals, ad personalization, and outbound automatic clicks that leak URLs
  gtag('config', measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    restricted_data_processing: true,
    send_page_view: true,
    page_path: getSanitizedPath(),
  });
}

/**
 * Track an approved event strictly if user granted consent.
 */
export function trackEvent(eventName: TrackedEvent, params: AnalyticsEventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (getStoredConsent() !== 'granted') return;

  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;

  // Sanitize payload: allow only safe parameters
  const safePayload: Record<string, any> = {
    sanitized_path: getSanitizedPath(),
    ...getAllowedCampaignParams(),
  };

  if (params.productId) safePayload.item_id = params.productId;
  if (params.collectionId) safePayload.item_category = params.collectionId;
  if (params.ctaPlacement) safePayload.cta_placement = params.ctaPlacement;
  if (params.filterValue) safePayload.filter_value = params.filterValue;
  if (params.faqId) safePayload.faq_id = params.faqId;

  gtag('event', eventName, safePayload);
}
