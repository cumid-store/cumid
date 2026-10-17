import { supabase, getLocalFavourites, saveLocalFavourites } from './supabase';

// Signed-in data stays in memory, never in shared guest localStorage.
let userId: string | null = null;
let current: string[] = [];
let ready: Promise<void> | undefined;
let errorMessage = '';
let revision = 0;
let mutation: Promise<unknown> = Promise.resolve();

function notify() {
  window.dispatchEvent(new CustomEvent('cumid:favourites-updated', {
    detail: { favourites: [...current], error: errorMessage },
  }));
}
export function snapshot() { return { favourites: [...current], error: errorMessage }; }

async function loadForUser(id: string | null) {
  const version = ++revision;
  userId = id;
  current = id ? [] : getLocalFavourites();
  errorMessage = '';
  notify();
  if (!id || !supabase) return;
  try {
    const { data, error } = await supabase.from('favourites').select('product_id').eq('user_id', id);
    if (version !== revision) return;
    if (error) throw error;
    current = (data || []).map(row => row.product_id);
  } catch {
    if (version !== revision) return;
    errorMessage = 'Cloud favourites are unavailable. Please try again later; browsing and WhatsApp still work.';
  }
  notify();
}

export function initializeFavourites(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (ready) return ready;
  ready = (async () => {
    if (!supabase) { await loadForUser(null); return; }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await loadForUser(data.session?.user.id || null);
    supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase calls must execute outside the auth lock.
      if ((session?.user.id || null) !== userId) {
        setTimeout(() => void loadForUser(session?.user.id || null), 0);
      }
    });
  })().catch(() => {
    errorMessage = 'Could not verify account status. Please reload to manage favourites.';
    notify();
  });
  window.addEventListener('storage', event => {
    if (!userId && event.key === 'cumid_guest_favourites_v1') {
      current = getLocalFavourites(); notify();
    }
  });
  return ready;
}

export async function toggleFavourite(productId: string): Promise<boolean> {
  const task = mutation.then(async () => {
    await initializeFavourites();
    if (errorMessage) throw new Error(errorMessage);
    const owner = userId;
    const version = revision;
    const adding = !current.includes(productId);
    if (owner && supabase) {
      const result = adding
        ? await supabase.from('favourites').upsert({ user_id: owner, product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
        : await supabase.from('favourites').delete().eq('user_id', owner).eq('product_id', productId);
      if (result.error) throw new Error('Could not save this change. Please try again.');
      if (version !== revision) throw new Error('Account changed. Please try again.');
    }
    current = adding ? [...new Set([...current, productId])] : current.filter(id => id !== productId);
    if (!owner) saveLocalFavourites(current);
    notify();
    return adding;
  });
  mutation = task.catch(() => {});
  return task;
}

export async function importGuestFavourites() {
  await initializeFavourites();
  if (!userId || !supabase) throw new Error('Please sign in first.');
  const owner = userId;
  const local = getLocalFavourites();
  if (!local.length) return;
  const { error } = await supabase.from('favourites').upsert(
    local.map(product_id => ({ user_id: owner, product_id })),
    { onConflict: 'user_id,product_id', ignoreDuplicates: true },
  );
  if (error) throw new Error('Could not import favourites. Your browser favourites have been kept.');
  if (userId !== owner) return;
  saveLocalFavourites([]);
  await loadForUser(owner);
}

export function clearAccountFavourites() {
  ++revision; userId = null; current = getLocalFavourites(); errorMessage = ''; notify();
}
