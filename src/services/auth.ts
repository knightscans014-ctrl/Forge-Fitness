// Professional authentication: email/password + Google OAuth via Supabase Auth.
// Handles session persistence, sign-up, sign-in, Google sign-in, and sign-out.
//
// To go live:
//  1. Create a Supabase project and enable Email + Google providers.
//  2. Set env vars:
//       EXPO_PUBLIC_SUPABASE_URL
//       EXPO_PUBLIC_SUPABASE_ANON_KEY
//     (Google requires configuring the OAuth callback URL in Supabase.)
//  3. This file wires straight to the Supabase client. It is fully typed
//     and ready; the client is null until env vars are set (safe for dev).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email: string | null;
  name?: string;
  avatarUrl?: string;
  provider?: 'email' | 'google';
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser };

import type { SupabaseClient } from '@supabase/supabase-js';
let supabase: SupabaseClient | null = null;

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

export function initAuth(url?: string, anonKey?: string): void {
  // Use env vars if not provided explicitly
  const finalUrl = url || supabaseUrl;
  const finalKey = anonKey || supabaseAnonKey;
  
  if (!finalUrl || !finalKey) {
    console.warn('Supabase credentials missing. Auth will not work until configured.');
    return;
  }
  
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(finalUrl, finalKey, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true },
  });
}

const GOOGLE_AUTH_URL = 'https://your-project.supabase.co/auth/v1/authorize?provider=google';

// Discover OAuth redirect config (works with Expo deep linking).
AuthSession.makeRedirectUri;

async function configureGoogleRedirect(): Promise<string> {
  const redirectUri = AuthSession.makeRedirectUri();
  WebBrowser.maybeCompleteAuthSession();
  return redirectUri;
}

export async function getSession(): Promise<AuthState> {
  if (!supabase) return { status: 'signedOut' };
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user) return { status: 'signedOut' };
    return { status: 'signedIn', user: mapUser(session.user) };
  } catch {
    return { status: 'signedOut' };
  }
}

export async function signUp(email: string, password: string, name?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name || 'Adventurer' } },
  });
  return error ? { error: error.message } : {};
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Auth not configured' };
  await configureGoogleRedirect();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: GOOGLE_AUTH_URL },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function onAuthChange(cb: (state: AuthState) => void): Promise<void> {
  if (!supabase) return;
  supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    if (!session?.user) cb({ status: 'signedOut' });
    else cb({ status: 'signedIn', user: mapUser(session.user) });
  });
}

function mapUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0],
    avatarUrl: u.user_metadata?.avatar_url,
    provider: u.app_metadata?.provider === 'google' ? 'google' : 'email',
  };
}

export { GOOGLE_AUTH_URL };
