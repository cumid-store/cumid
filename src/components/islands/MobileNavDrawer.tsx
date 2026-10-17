import { useDialogFocus } from '../../lib/useDialogFocus';
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Heart, User, MessageCircle, ExternalLink } from 'lucide-react';
import { SITE } from '../../config/site';
import { initializeFavourites, snapshot } from '../../lib/favourites';

export const MobileNavDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [favCount, setFavCount] = useState(0);

  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, drawerRef, () => setIsOpen(false));

  useEffect(() => {
    void initializeFavourites().then(() => setFavCount(snapshot().favourites.length));
    const handleFavChange = (e: any) => {
      const list = e.detail?.favourites || snapshot().favourites;
      setFavCount(list.length);
    };
    window.addEventListener('cumid:favourites-updated', handleFavChange);
    return () => window.removeEventListener('cumid:favourites-updated', handleFavChange);
  }, []);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-drawer"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        className="p-2 rounded-sm text-charcoal-800 hover:bg-ivory-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div
          ref={drawerRef}
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-x-0 top-full h-[calc(100dvh-8rem)] z-40 bg-ivory-100 flex flex-col justify-between p-6 border-t border-charcoal-800/10 overflow-y-auto animate-in fade-in duration-200"
        >
          <button type="button" onClick={() => setIsOpen(false)} className="self-end p-3" aria-label="Close menu">Close</button>
          <nav className="flex flex-col space-y-4 pt-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-charcoal-700/60 pb-1 border-b border-charcoal-800/10">
              Navigation
            </span>
            {SITE.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-charcoal-800 hover:text-lavender-700 py-1 transition-colors"
              >
                {link.label}
              </a>
            ))}

            <span className="text-xs uppercase tracking-widest font-semibold text-charcoal-700/60 pt-4 pb-1 border-b border-charcoal-800/10">
              Collections
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {SITE.themes.map((theme) => (
                <a
                  key={theme.slug}
                  href={`/collections/${theme.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-2 rounded-sm bg-ivory-200 text-xs font-medium text-charcoal-800 hover:bg-ivory-300"
                >
                  {theme.name}
                </a>
              ))}
            </div>

            <span className="text-xs uppercase tracking-widest font-semibold text-charcoal-700/60 pt-4 pb-1 border-b border-charcoal-800/10">
              Account &amp; Saved
            </span>
            <div className="flex flex-col gap-2">
              <a
                href="/account/favourites"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-sm bg-ivory-200 text-sm font-medium text-charcoal-800"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-peach-700" />
                  <span>Saved Favourites</span>
                </div>
                {favCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-peach-300 text-peach-700">
                    {favCount}
                  </span>
                )}
              </a>

              <a
                href="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm bg-ivory-200 text-sm font-medium text-charcoal-800"
              >
                <User className="w-4 h-4 text-lavender-700" />
                <span>Account &amp; Sign-in</span>
              </a>
            </div>
          </nav>

          <div className="pt-6 border-t border-charcoal-800/10 space-y-3">
            <a
              href={SITE.whatsappBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp Preorder Desk</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
            <p className="text-[11px] text-center text-charcoal-700/70">
              Customer enquiries: {SITE.whatsappDisplayNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default MobileNavDrawer;
