import { useDialogFocus } from '../../lib/useDialogFocus';
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, Settings2 } from 'lucide-react';
import { getStoredConsent, setStoredConsent, initializeGA4IfConfigured } from '../../lib/analytics';
const analyticsConfigured = /^G-[A-Z0-9]+$/.test(import.meta.env.PUBLIC_GA4_MEASUREMENT_ID || '');

export const AnalyticsConsentBanner: React.FC = () => {
  const [consent, setConsent] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(showPreferencesModal, dialogRef, () => setShowPreferencesModal(false));

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
      {analyticsConfigured && consent === 'pending' && !showPreferencesModal && (
        <aside
          role="region"
          aria-label="Privacy & Analytics Choices"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-5 rounded-sm bg-ivory-100 border border-charcoal-800/15  transition-all"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-lavender-700 mt-0.5 shrink-0" />
            <div className="text-xs text-charcoal-800 space-y-2">
              <h2 className="font-semibold text-sm text-charcoal-900">Privacy &amp; Analytics Choices</h2>
              <p className="text-charcoal-700 leading-relaxed">
                May we use optional Google Analytics to see which covers people browse? You can decline and still use the store. Change your choice anytime in the footer.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-2 rounded-sm text-xs font-semibold bg-charcoal-800 text-ivory-100 hover:bg-charcoal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600"
                >
                  Accept analytics
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-3.5 py-2 rounded-sm text-xs font-semibold bg-ivory-300 text-charcoal-800 border border-charcoal-800/20 hover:bg-ivory-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-800"
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
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg p-6 rounded-sm bg-ivory-100 border border-charcoal-800/15  max-h-[90vh] overflow-y-auto">
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
              <div className="p-3.5 rounded-sm bg-ivory-200 border border-charcoal-800/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal-900 text-sm">Essential website storage</span>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-charcoal-800 text-ivory-100">Always Active</span>
                </div>
                <p>
                  Your browser stores saved covers and privacy choices. If account sign-in is enabled, it also stores your session. Hosting providers process technical requests to deliver and protect the website.
                </p>
              </div>

              {/* Optional Marketing Analytics Layer */}
              <div className="p-3.5 rounded-sm bg-ivory-200 border border-charcoal-800/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal-900 text-sm">Optional Product Analytics (GA4)</span>
                  <span className="text-[11px] text-charcoal-700">{analyticsConfigured ? 'Requires opt-in' : 'Not enabled'}</span>
                </div>
                <p>
                  {analyticsConfigured ? 'With your permission, measures cover interest and WhatsApp enquiry clicks. We do not include names or contact details in event payloads.' : 'Google Analytics is not enabled on this version of the website. No Google Analytics consent is needed to browse.'}
                </p>
              </div>

              <p className="text-[11px] text-charcoal-700">
                You can change your preferences at any moment via the "Cookie &amp; Privacy Preferences" link in the footer.
              </p>
            </div>

            {analyticsConfigured && <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal-800/10">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-sm text-xs font-semibold bg-ivory-300 text-charcoal-800 border border-charcoal-800/20 hover:bg-ivory-400"
              >
                Reject optional analytics
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-sm text-xs font-semibold bg-charcoal-800 text-ivory-100 hover:bg-charcoal-900"
              >
                Accept analytics
              </button>
            </div>}
          </div>
        </div>
      )}
    </>
  );
};
export default AnalyticsConsentBanner;
