import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Trash2, Heart, ShieldAlert, CheckCircle2, User } from 'lucide-react';
import { supabase, isSupabaseConfigured, getLocalFavourites, saveLocalFavourites } from '../../lib/supabase';

export const AccountView: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        mergeGuestFavouritesOnLogin(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        mergeGuestFavouritesOnLogin(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Merge local favourites on login safely
  const mergeGuestFavouritesOnLogin = async (userId: string) => {
    if (!supabase) return;
    try {
      const local = getLocalFavourites();
      if (local.length > 0) {
        // Fetch existing cloud favourites
        const { data: remote } = await supabase
          .from('favourites')
          .select('product_id')
          .eq('user_id', userId);

        const existingIds = new Set(remote?.map((r) => r.product_id) || []);
        const toInsert = local.filter((id) => !existingIds.has(id));

        if (toInsert.length > 0) {
          await supabase.from('favourites').insert(
            toInsert.map((productId) => ({
              user_id: userId,
              product_id: productId,
            }))
          );
        }

        // Refresh total list locally
        const merged = Array.from(new Set([...Array.from(existingIds), ...local]));
        saveLocalFavourites(merged);
        window.dispatchEvent(
          new CustomEvent('cumid:favourites-updated', { detail: { favourites: merged } })
        );
      }
    } catch (e) {
      console.warn('CUMID: Favourites merge note:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase authentication is pending owner credentials. Guest mode remains fully operational.');
      return;
    }
    setErrorMsg(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile', // Minimal scopes: no drive, gmail, contacts
        },
      });
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not initiate Google sign-in.');
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !session?.user) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete your profile and cloud-saved favourites.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setErrorMsg(null);

    try {
      // Call Supabase RPC to delete the account and cascading records
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        // Fallback: document manual deletion request if RPC is not provisioned
        throw new Error(
          'Automated self-service deletion is waiting for server RPC configuration. Please request deletion via WhatsApp (+91 7023987458) or sign out.'
        );
      }
      await supabase.auth.signOut();
      setSession(null);
      setDeletionSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not complete automated account deletion.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-charcoal-700">
        Checking account status...
      </div>
    );
  }

  // If Supabase credentials are not configured yet, show clear disclosure without fake forms
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-ivory-200 border border-charcoal-800/10 space-y-3">
          <div className="flex items-center gap-2.5 text-lavender-700">
            <User className="w-5 h-5" />
            <h2 className="font-bold text-base text-charcoal-900">Guest Mode Active</h2>
          </div>
          <p className="text-sm text-charcoal-700 leading-relaxed">
            You are browsing as a guest. Your saved favourites are safely stored in your local browser storage. Browsing the catalogue, reading our journal, and sending preorder enquiries on WhatsApp work 100% without an account.
          </p>
          <div className="pt-2">
            <a
              href="/account/favourites"
              className="btn-secondary gap-2 text-xs"
            >
              <Heart className="w-4 h-4 text-peach-700" />
              <span>View local favourites</span>
            </a>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-ivory-100 border border-charcoal-800/10 text-xs text-charcoal-700 space-y-2">
          <span className="font-semibold text-charcoal-900 block">Owner Setup Note:</span>
          <p>
            Google OAuth with Supabase Free tier is ready in code. To activate cloud login, add your <code>PUBLIC_SUPABASE_URL</code> and <code>PUBLIC_SUPABASE_ANON_KEY</code> to the hosting environment. See <a href="/docs/OAUTH_SETUP_GUIDE.md" className="underline font-medium">OAuth Setup Guide</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {deletionSuccess && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Your account and saved data have been permanently deleted.</span>
        </div>
      )}

      {session ? (
        <div className="p-6 rounded-2xl bg-ivory-100 border border-charcoal-800/15 space-y-6">
          <div className="flex items-center gap-4">
            {session.user.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="Profile avatar"
                className="w-14 h-14 rounded-full border border-charcoal-800/10 object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-lavender-200 flex items-center justify-center text-lavender-700 font-bold text-lg">
                {(session.user.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-base text-charcoal-900">
                {session.user.user_metadata?.full_name || 'CUMID Reader'}
              </h2>
              <p className="text-xs text-charcoal-700">{session.user.email}</p>
              <span className="inline-block mt-1 text-[11px] font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                Google Authenticated
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-charcoal-800/10 flex flex-wrap items-center gap-3">
            <a
              href="/account/favourites"
              className="btn-primary text-xs gap-2"
            >
              <Heart className="w-4 h-4 text-peach-300" />
              <span>Manage saved favourites</span>
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-secondary text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          <div className="pt-6 border-t border-charcoal-800/10 space-y-2">
            <h3 className="font-semibold text-xs text-charcoal-900 uppercase tracking-wider">
              Privacy &amp; Data Deletion
            </h3>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              In accordance with our privacy practices and DPDP principles, you can delete your account and all associated cloud-saved favourites at any time.
            </p>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? 'Deleting account...' : 'Delete my account permanently'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-ivory-100 border border-charcoal-800/15 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-lavender-100 flex items-center justify-center text-lavender-700">
            <LogIn className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-bold text-base text-charcoal-900">Sign in with Google</h2>
            <p className="text-xs text-charcoal-700 max-w-sm mx-auto">
              Sign in to sync your saved favourite covers across your devices. Minimal permissions: email &amp; basic profile only.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn-primary text-xs gap-2.5 mx-auto"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-[11px] text-charcoal-700/60 pt-2">
            No password or credit card required. Guests can still enquire on WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
};
export default AccountView;
