import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  // Use placeholder values during build/SSR when env vars aren't available.
  // The client won't make real requests — pages are 'use client' and only
  // run Supabase calls in the browser where env vars are injected at runtime.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  client = createBrowserClient(url, key);
  return client;
}
