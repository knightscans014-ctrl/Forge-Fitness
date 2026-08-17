// Server-authority premium + admin checks.
//
// ANTI-CRACK CORE: The app NEVER trusts local state for premium/admin. It
// queries the Supabase server, which is the only authority. A modded APK can
// edit local files all it wants, but it cannot make the server say "premium"
// because only SECURITY DEFINER functions (admin-gated) can grant it.
//
// Everything here goes through the SHARED client (supabaseClient.ts) so the
// signed-in session is actually attached to these requests. Previously this
// module built its own anonymous client and every check silently returned false.

import { getSupabase, currentUser } from './supabaseClient';

export interface ServerPremiumStatus {
  isPremium: boolean;
  tier: string | null;
  expiresAt: string | null;
}

export const NO_PREMIUM: ServerPremiumStatus = { isPremium: false, tier: null, expiresAt: null };

/** Kept for API compatibility; the shared client self-initialises. */
export function initSecureAuth(): void {
  getSupabase();
}

/**
 * Ask the SERVER if this user has premium. Never trust local state.
 * Uses the my_premium() RPC, which resolves the caller from their JWT --
 * a client cannot ask about somebody else, and cannot forge the answer.
 */
export async function fetchPremiumStatus(): Promise<ServerPremiumStatus> {
  const supabase = getSupabase();
  if (!supabase) return NO_PREMIUM;
  try {
    const { data, error } = await supabase.rpc('my_premium');
    if (error) return NO_PREMIUM;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NO_PREMIUM;
    return {
      isPremium: !!row.is_premium,
      tier: row.tier ?? null,
      expiresAt: row.expires_at ?? null,
    };
  } catch {
    return NO_PREMIUM;
  }
}

/**
 * Is the current signed-in user an admin?
 *
 * IMPORTANT: this calls the is_admin() RPC, NOT `select from admins`.
 * The admins table now has RLS with zero policies (that's what blocks the
 * privilege-escalation attack), so a direct select returns 0 rows for
 * everyone -- including the real owner. Only the SECURITY DEFINER function
 * can see inside it.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Admin: approve a payment by its UTR-bearing row id.
 *
 * Calls approve_payment(), which atomically marks the payment approved AND
 * writes the entitlement in one transaction. The old code did a client-side
 * grant_premium() + a separate status update, which could half-apply and
 * granted premium that never expired.
 */
export async function adminApprovePayment(
  paymentId: string,
  months = 12,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected' };
  try {
    const { error } = await supabase.rpc('approve_payment', {
      p_payment_id: paymentId,
      p_months: months,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Approval failed' };
  }
}

/** Admin: reject a payment. */
export async function adminRejectPayment(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected' };
  try {
    const { error } = await supabase.rpc('reject_payment', { p_payment_id: paymentId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Rejection failed' };
  }
}

/** Admin: revoke an active entitlement. */
export async function adminRevokePremium(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected' };
  try {
    const { error } = await supabase.rpc('revoke_premium', { target_user: userId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Revoke failed' };
  }
}

export { currentUser };
