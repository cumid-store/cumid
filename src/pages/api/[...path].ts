import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleApi } from '../../lib/server/commerce-api';
export const prerender = false;
export const ALL: APIRoute = ({request}) => handleApi(request, {
 ...env as Record<string,string>,
 PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || (env as any).PUBLIC_SUPABASE_URL,
 PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || (env as any).PUBLIC_SUPABASE_ANON_KEY,
 PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL || 'https://cumid.store',
});
