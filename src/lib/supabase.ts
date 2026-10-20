/**
 * CUMID Store — Supabase Client & Graceful Degradation Layer
 * 
 * Safety & Resilience Rules:
 * 1. The catalogue, pages, and WhatsApp enquiries NEVER depend on Supabase being online.
 * 2. If Supabase is unconfigured, offline, or quotas are exceeded, favourites transparently fallback to localStorage.
 * 3. Guest favourites are clearly disclosed and stored locally under 'cumid_guest_favourites_v1'.
 * 4. Merging occurs cleanly upon login without leaking user data.
 * 5. Uses @supabase/ssr createBrowserClient so session tokens are persisted in cookies and readable by Astro middleware.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('YOUR_PROJECT_ID')
);

// Authorized admin email allowlist
export const ALLOWED_ADMIN_EMAILS: readonly string[] = [
  'sumitkatiyar783@gmail.com',
  'ankshitdey@gmail.com',
  'sumitkatiyar3655@gmail.com',
];

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === cleanEmail);
}

// Uses @supabase/ssr createBrowserClient to persist auth session tokens into cookies
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

// Self-healing bridge: proactively sync localStorage session to cookies
if (typeof window !== 'undefined' && supabase && isSupabaseConfigured) {
  try {
    const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : '';
    const cookieKey = `sb-${projectRef}-auth-token`;
    const localRaw = localStorage.getItem(cookieKey);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed?.access_token && parsed?.refresh_token) {
        supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        }).catch(() => {});
      }
    }
  } catch {
    // Ignore storage sync errors
  }
}

// Guest localStorage key
export const GUEST_FAVOURITES_STORAGE_KEY = 'cumid_guest_favourites_v1';

export function getLocalFavourites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_FAVOURITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && /^CUMID-(FL|HG|CT|CJ|OR)-\d{3}$/.test(id)).slice(0, 100) : [];
  } catch (e) {
    console.warn('CUMID: Could not read local favourites', e);
    return [];
  }
}

export function saveLocalFavourites(favourites: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_FAVOURITES_STORAGE_KEY, JSON.stringify(Array.from(new Set(favourites))));
  } catch (e) {
    console.warn('CUMID: Could not persist local favourites', e);
  }
}

export function toggleLocalFavourite(productId: string): { isFavourite: boolean; favourites: string[] } {
  const current = getLocalFavourites();
  const exists = current.includes(productId);
  const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
  saveLocalFavourites(updated);
  return { isFavourite: !exists, favourites: updated };
}

export async function getCurrentProfile(): Promise<{ id: string; role: 'customer' | 'admin'; displayName?: string } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const isAdmin = isAllowedAdminEmail(session.user.email);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      return { 
        id: session.user.id, 
        role: isAdmin ? 'admin' : 'customer', 
        displayName: session.user.email 
      };
    }
    return {
      id: data.id,
      role: isAdmin ? 'admin' : ((data.role as 'customer' | 'admin') || 'customer'),
      displayName: data.display_name,
    };
  } catch {
    return null;
  }
}
