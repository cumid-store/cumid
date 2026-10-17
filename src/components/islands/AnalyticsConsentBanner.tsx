import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Settings2 } from 'lucide-react';
import { getStoredConsent, setStoredConsent, initializeGA4IfConfigured } from '../../lib/analytics';

export const AnalyticsConsentBanner: React.FC = () => {
  const [consent, setConsent] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getStoredConsent();
    setConsent(initial);
    if (initial === 'granted') {
      initializeGA4IfConfigured();
    }

    const handleOpenModal = () => setShowPreferencesModal(true);
    const handleConsentChange = (e: any) => {
      setConsent(e.detail?.status || getStoredConsent());
    };

    window.addEventListener('cumid:open-consent-modal', handleOpenModal);
    window.addEventListener('cumid:consent-changed', handleConsentChange);

    return () => {
      window.removeEventListener('cumid:open-consent-modal', handleOpenModal);
      window.removeEventListener('cumid:consent-changed', handleConsentChange);
    };
  }, []);

  if (!mounted) return null;

  const handleAcceptAll = () => {
    setStoredConsent('granted');
    setShowPreferencesModal(false);
  };

  const handleRejectAll = () => {
    setStoredConsent('denied');
    setShowPreferencesModal(false);
  };

  return (
    <>
      {/* 1. First-visit Consent Notification Banner */}
      {consent === 'pending' && !showPreferencesModal && (
        <aside
          role="region"
          aria-label="Privacy & Analytics Choices"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/15 shadow-soft-xl transition-all"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-lavender-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-charcoal-800 space-y-2">
              <h2 className="font-semibold text-sm text-charcoal-900">Privacy &amp; Analytics Choices</h2>
              <p className="text-charcoal-700 leading-relaxed">
                We respect your attention and privacy. We use anonymous aggregate analytics for site speed, and request your permission for optional Google Analytics to understand cover interest. No ads, tracking pixels, or keystroke recorders.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold bg-charcoal-800 text-ivory-100 hover:bg-charcoal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600"
                >
                  Accept analytics
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold bg-ivory-300 text-charcoal-800 border border-charcoal-800/20 hover:bg-ivory-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-800"
                >
                  Reject optional analytics
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(true)}
                  className="text-xs text-lavender-700 underline underline-offset-2 hover:text-lavender-900 ml-1"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Granular Preferences Modal (accessible at any time from footer) */}
      {showPreferencesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg p-6 rounded-2xl bg-ivory-100 border border-charcoal-800/15 shadow-soft-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-800/10">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-lavender-700" />
                <h2 id="privacy-modal-title" className="font-bold text-base text-charcoal-900">
                  Cookie &amp; Analytics Preferences
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                aria-label="Close preferences"
                className="p-1 rounded-md text-charcoal-700 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-charcoal-700 leading-relaxed">
              {/* Essential Layer */}
              <div className="p-3.5 rounded-xl bg-ivory-200 border border-charcoal-800/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal-900 text-sm">Essential &amp; Performance</span>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-charcoal-800 text-ivory-100">Always Active</span>
                </div>
                <p>
                  Includes secure hosting logs and Cloudflare Web Analytics (aggregate page timings and requests without persistent cookies or personal identifiers). Needed for basic site delivery.
                </p>
              </div>

              {/* Optional Marketing Analytics Layer */}
              <div className="p-3.5 rounded-xl bg-ivory-200 border border-charcoal-800/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal-900 text-sm">Optional Product Analytics (GA4)</span>
                  <span className="text-[11px] text-charcoal-700">Requires Opt-In</span>
                </div>
                <p>
                  Helps us gauge cover interest and WhatsApp preorder clicks. Anonymized IP enabled, no Google Signals, no advertising personalization, no cross-device tracking.
                </p>
              </div>

              <p className="text-[11px] text-charcoal-700">
                You can change your preferences at any moment via the "Cookie &amp; Privacy Preferences" link in the footer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal-800/10">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-ivory-300 text-charcoal-800 border border-charcoal-800/20 hover:bg-ivory-400"
              >
                Reject optional analytics
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-charcoal-800 text-ivory-100 hover:bg-charcoal-900"
              >
                Accept analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default AnalyticsConsentBanner;
