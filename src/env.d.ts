/// <reference path="../.astro/types.d.ts" />
declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>;
}

declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User | null;
    supabase?: import('@supabase/supabase-js').SupabaseClient | null;
    runtime?: {
      env?: Record<string, string | undefined>;
    };
  }
}
