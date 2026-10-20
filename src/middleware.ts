import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Explicit list of allowed admin emails
const ALLOWED_ADMIN_EMAILS: readonly string[] = [
  'sumitkatiyar783@gmail.com',
  'ankshitdey@gmail.com',
  'sumitkatiyar3655@gmail.com',
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Rule 1: Only run this check on routes starting with /admin
  if (!pathname.startsWith('/admin')) {
    return next();
  }

  // During static site generation (build time), allow page HTML to prerender
  if (context.isPrerendered) {
    return next();
  }

  // Cloudflare Pages / standard SSR compatible environment variable resolution
  const supabaseUrl =
    import.meta.env.PUBLIC_SUPABASE_URL ||
    (context.locals as any)?.runtime?.env?.PUBLIC_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_URL : '') ||
    '';

  const supabaseAnonKey =
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    (context.locals as any)?.runtime?.env?.PUBLIC_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_ANON_KEY : '') ||
    '';

  // If Supabase credentials are missing, redirect to /account
  if (!supabaseUrl || !supabaseAnonKey) {
    return context.redirect(`/account?redirect=${encodeURIComponent(pathname)}`);
  }

  // Initialize Supabase SSR client with request cookies and response setter
  const supabase: SupabaseClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });

  // Verify the active session using getUser() to ensure JWT authenticity, with fallback to getSession()
  let user: any = null;
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    user = userData.user;
  } else {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      user = sessionData.session.user;
    }
  }

  // Rule 2: If there is no active Supabase session, redirect to /account
  if (!user) {
    return context.redirect(`/account?redirect=${encodeURIComponent(pathname)}`);
  }

  // Rule 3: Check if authenticated user's email exists in the allowed emails array
  const userEmail = (user.email ?? '').trim().toLowerCase();
  const isAllowed = ALLOWED_ADMIN_EMAILS.some(
    (allowedEmail) => allowedEmail.trim().toLowerCase() === userEmail
  );

  // Rule 4: If their email is not in the list, redirect them to the home page /
  if (!isAllowed) {
    return context.redirect('/');
  }

  // Attach verified user and client to locals for downstream access if needed
  if (context.locals) {
    (context.locals as any).user = user;
    (context.locals as any).supabase = supabase;
  }

  return next();
});
