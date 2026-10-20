import React, { useState, useEffect } from 'react';
import { User, LogIn } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const HeaderAuthButton: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(Boolean(session?.user));
      setUserEmail(session?.user?.email || null);
    }).catch(() => {});

    // Live auth state subscription: switches immediately on sign in / sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <a
      href="/account"
      className="p-2.5 rounded-full text-charcoal-800 hover:bg-ivory-300 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600 inline-flex items-center justify-center"
      aria-label={isLoggedIn ? `My Account (${userEmail || 'Signed in'})` : 'Sign in to your account'}
      title={isLoggedIn ? `My Account (${userEmail || 'Signed in'})` : 'Sign in'}
    >
      {isLoggedIn ? (
        <User className="w-5 h-5 text-charcoal-800 transition-transform hover:scale-105" />
      ) : (
        <LogIn className="w-5 h-5 text-charcoal-800 transition-transform hover:scale-105" />
      )}
    </a>
  );
};

export default HeaderAuthButton;
