import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/SSR prerendering env vars may not be available.
  // Return a no-op proxy so the build doesn't crash. Real calls only
  // happen in the browser where env vars are injected at runtime.
  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase env vars missing — client will not function.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as any, {
      get: () => () => new Proxy({} as any, { get: () => () => ({ data: null, error: null }) }),
    }) as ReturnType<typeof createBrowserClient>;
  }

  client = createBrowserClient(url, key);
  return client;
}
