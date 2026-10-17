/**
 * CUMID Store — Supabase Client & Graceful Degradation Layer
 * 
 * Safety & Resilience Rules:
 * 1. The catalogue, pages, and WhatsApp enquiries NEVER depend on Supabase being online.
 * 2. If Supabase is unconfigured, offline, or quotas are exceeded, favourites transparently fallback to localStorage.
 * 3. Guest favourites are clearly disclosed and stored locally under 'cumid_guest_favourites_v1'.
 * 4. Merging occurs cleanly upon login without leaking user data.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Guest localStorage key
export const GUEST_FAVOURITES_STORAGE_KEY = 'cumid_guest_favourites_v1';

export function getLocalFavourites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_FAVOURITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
