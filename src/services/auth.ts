// Professional authentication: email/password + Google OAuth via Supabase Auth.
// Handles session persistence, sign-up, sign-in, Google sign-in, and sign-out.
//
// To go live:
//  1. Create a Supabase project and enable Email + Google providers.
//  2. Set env vars:
//       EXPO_PUBLIC_SUPABASE_URL
//       EXPO_PUBLIC_SUPABASE_ANON_KEY
//     (Google requires configuring the OAuth callback URL in Supabase.)
//  3. This file wires straight to the shared Supabase client (supabaseClient.ts).
//     The client is null until env vars are set (safe for dev).

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

import { getSupabase, isConfigured } from './supabaseClient';

/**
 * Initialise auth. Safe to call repeatedly — the shared client is built once.
 * Previously AuthContext never called this, so `supabase` stayed null and every
 * auth call returned 'Auth not configured'. Now the client is lazily created on
 * first use, so auth works even if initAuth() is never called explicitly.
 */
export function initAuth(): void {
  getSupabase();
}

// Complete any pending OAuth session as early as possible (required on web
// and harmless on native).
WebBrowser.maybeCompleteAuthSession();

/**
 * The deep link Supabase should send the user back to after Google sign-in.
 * Computed from the running app (expo-auth-session) rather than hardcoded --
 * the old code built a 'your-project.supabase.co' URL and used it as redirectTo,
 * which broke Google sign-in entirely.
 *
 * Add the value this returns to Supabase -> Authentication -> URL Configuration
 * -> Redirect URLs.
 */
export function googleRedirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'forge', path: 'auth/callback' });
}

export async function getSession(): Promise<AuthState> {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  if (!supabase) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name || 'Adventurer' } },
  });
  return error ? { error: error.message } : {};
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Auth not configured' };

  const redirectTo = googleRedirectUri();
  try {
    // skipBrowserRedirect: we open the URL ourselves so we can capture the
    // callback and hand the code back to Supabase (RN has no URL bar).
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: 'Could not start Google sign-in' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return result.type === 'cancel' || result.type === 'dismiss'
        ? { error: 'Sign-in cancelled' }
        : { error: 'Google sign-in failed' };
    }

    // Exchange the returned code (PKCE) for a real session.
    const url = result.url;
    const code = /[?&]code=([^&]+)/.exec(url)?.[1];
    if (code) {
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(
        decodeURIComponent(code),
      );
      return exErr ? { error: exErr.message } : {};
    }

    // Implicit flow fallback: tokens arrive in the URL fragment.
    const frag = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
    const access_token = /(?:^|&)access_token=([^&]+)/.exec(frag)?.[1];
    const refresh_token = /(?:^|&)refresh_token=([^&]+)/.exec(frag)?.[1];
    if (access_token && refresh_token) {
      const { error: sErr } = await supabase.auth.setSession({
        access_token: decodeURIComponent(access_token),
        refresh_token: decodeURIComponent(refresh_token),
      });
      return sErr ? { error: sErr.message } : {};
    }
    return { error: 'No session returned from Google' };
  } catch (e: any) {
    return { error: e?.message || 'Google sign-in failed' };
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function onAuthChange(cb: (state: AuthState) => void): Promise<void> {
  const supabase = getSupabase();
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
