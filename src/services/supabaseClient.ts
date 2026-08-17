// SINGLE shared Supabase client.
//
// Why this file exists: auth.ts, secureAuth.ts and sync.ts each used to build
// their OWN createClient(). Only the auth one held a session, so every
// server-authority check (premium, admin, payments) ran as an anonymous user
// and silently returned false. One client, one session, one source of truth.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let warned = false;

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Build (once) and return the shared client.
 * Returns null when env vars are missing so the app still runs offline in dev.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (!warned) {
      warned = true;
      console.warn(
        '[forge] Supabase not configured — set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. Running in offline mode.',
      );
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js');
  client = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL bar to parse an OAuth callback from.
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** True when the backend is reachable/configured. */
export function isConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/** Current user id, or null. Cheap: reads the cached session. */
export async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Current user (id + email), or null. */
export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const u = data?.session?.user;
    if (!u) return null;
    return { id: u.id, email: u.email ?? null };
  } catch {
    return null;
  }
}
