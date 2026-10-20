/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User | null;
    supabase?: import('@supabase/supabase-js').SupabaseClient | null;
    runtime?: {
      env?: Record<string, string | undefined>;
    };
  }
}