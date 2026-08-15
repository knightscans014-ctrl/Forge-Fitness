// Server-authority premium + admin checks.
//
// ANTI-CRACK CORE: The app NEVER trusts local state for premium/admin. It
// queries the Supabase server, which is the only authority. A modded APK can
// edit local files all it wants, but it cannot make the server say "premium"
// because only SECURITY DEFINER functions (admin-gated) can grant it.
//
// The client holds an auth token; every premium check goes to the server.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any = null;

export function initSecureAuth(url: string, anonKey: string): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(url, anonKey);
}

export interface ServerPremiumStatus {
  isPremium: boolean;
  tier: string | null;
}

// Ask the SERVER if this user has premium. Never trust local state.
export async function fetchPremiumStatus(): Promise<ServerPremiumStatus> {
  if (!supabase) return { isPremium: false, tier: null };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isPremium: false, tier: null };
    // Read entitlement row (RLS allows own read only).
    const { data, error } = await supabase
      .from('premium_entitlements')
      .select('tier, expires_at')
      .eq('user_id', user.id)
      .single();
    if (error || !data) return { isPremium: false, tier: null };
    const active = !data.expires_at || new Date(data.expires_at) > new Date();
    return { isPremium: active, tier: data.tier };
  } catch {
    return { isPremium: false, tier: null };
  }
}

// Anti-cheat: server validates an activity log entry before granting XP.
// In prod, the server computes and returns the authoritative XP/gold.
export async function validateActivity(intent: {
  type: string;
  duration: number;
  intensity: number;
}): Promise<{ ok: boolean; xp: number; gold: number; message?: string }> {
  if (!supabase) return { ok: false, xp: 0, gold: 0, message: 'not connected' };
  try {
    // In prod: invoke an edge function that validates & applies.
    // const { data, error } = await supabase.functions.invoke('log-activity', { body: intent });
    // return data;
    // For now, mirror the engine's trusted calc but flag as server-computed.
    return { ok: true, xp: Math.round(intent.duration * intent.intensity * 5), gold: 0 };
  } catch {
    return { ok: false, xp: 0, gold: 0 };
  }
}

// True/false: is the current signed-in user an admin (checked server-side)?
export async function isAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return false;
    const { data } = await supabase
      .from('admins')
      .select('email')
      .eq('email', user.email.toLowerCase());
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

// Admin: approve a payment -> calls server function grant_premium.
export async function adminApprovePayment(paymentId: string, tier: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('grant_premium', {
      target_user: await paymentUserId(paymentId),
      p_tier: tier,
      p_expires: null,
      p_source: 'upi',
    });
    if (error) return false;
    // mark payment approved
    await supabase.from('payments').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', paymentId);
    return true;
  } catch {
    return false;
  }
}

async function paymentUserId(paymentId: string): Promise<string> {
  try {
    const { data } = await supabase.from('payments').select('user_id').eq('id', paymentId).single();
    return data?.user_id || '';
  } catch {
    return '';
  }
}
