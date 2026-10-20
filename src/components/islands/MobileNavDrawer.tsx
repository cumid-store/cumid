import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Heart, User, LogIn, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { SITE } from '../../config/site';
import { initializeFavourites, snapshot } from '../../lib/favourites';
import { supabase, isAllowedAdminEmail } from '../../lib/supabase';

// Links only in the dropdown (Shop/Collections/Our Story are already in the inline bar)
const DROPDOWN_LINKS = [
  { label: 'Journal', href: '/journal' },
  { label: 'FAQ', href: '/faq' },
];

export const MobileNavDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void initializeFavourites().then(() => setFavCount(snapshot().favourites.length));
    const handleFavChange = (e: any) => {
      const list = e.detail?.favourites || snapshot().favourites;
      setFavCount(list.length);
    };
    window.addEventListener('cumid:favourites-updated', handleFavChange);

    // Check if user is authenticated and if admin
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(Boolean(session?.user));
        setIsAdmin(isAllowedAdminEmail(session?.user?.email));
      }).catch(() => {});

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(Boolean(session?.user));
        setIsAdmin(isAllowedAdminEmail(session?.user?.email));
      });

      return () => {
        window.removeEventListener('cumid:favourites-updated', handleFavChange);
        subscription.unsubscribe();
      };
    }

    return () => window.removeEventListener('cumid:favourites-updated', handleFavChange);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Close when clicking outside the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  return (
    <div className="md:hidden relative" ref={wrapperRef}>

      {/* Hamburger / Close toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-dropdown"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        className="p-2 rounded-sm text-charcoal-800 hover:bg-ivory-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Compact dropdown panel — anchored right, only covers partial screen */}
      {isOpen && (
        <div
          id="mobile-nav-dropdown"
          role="menu"
          aria-label="Site navigation"
          className="absolute right-0 top-full mt-2 w-56 bg-ivory-100 rounded-xl shadow-2xl border border-charcoal-800/10 overflow-hidden z-50"
          style={{ boxShadow: '0 8px 32px rgba(37,35,33,0.13)' }}
        >
          {/* Navigation links */}
          <div className="px-2 pt-2 pb-1">
            <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-semibold text-charcoal-700/50">
              More pages
            </p>
            {DROPDOWN_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-charcoal-800 hover:bg-lavender-50 hover:text-lavender-700 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-charcoal-800/8 my-1" />

          {/* Account & Favourites links */}
          <div className="px-2 pb-1">
            <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-semibold text-charcoal-700/50">
              Account
            </p>
            {isAdmin && (
              <a
                href="/admin"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 mb-1 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Admin Portal
              </a>
            )}
            <a
              href="/account/favourites"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-charcoal-800 hover:bg-lavender-50 hover:text-lavender-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-peach-700" />
                Saved Favourites
              </span>
              {favCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-peach-300 text-peach-700">
                  {favCount}
                </span>
              )}
            </a>
            <a
              href="/account"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-charcoal-800 hover:bg-lavender-50 hover:text-lavender-700 transition-colors"
            >
              {isLoggedIn ? (
                <>
                  <User className="w-4 h-4 text-lavender-700" />
                  <span>My Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-lavender-700" />
                  <span>Sign In</span>
                </>
              )}
            </a>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-charcoal-800/8 my-1" />

          {/* WhatsApp CTA */}
          <div className="px-2 pb-2">
            <a
              href={SITE.whatsappBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-charcoal-800 hover:bg-lavender-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-green-700" />
              WhatsApp Preorders
              <ExternalLink className="w-3 h-3 opacity-50 ml-auto" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavDrawer;
