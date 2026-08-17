// Supabase sync service — cloud save + leaderboard.
// Backed by the schema in supabase/schema.sql.
//
// This was previously a stub that never created a client, so progress lived
// only on the device and a reinstall wiped everything. It now uses the shared
// client and performs real reads/writes.

import { GameState, computePower } from '../engine';
import { getSupabase, currentUserId, currentUser } from './supabaseClient';

/** Kept for API compatibility; the shared client self-initialises. */
export function initSync(): void {
  getSupabase();
}

// ---------------------------------------------------------------------------
// Cloud save
// ---------------------------------------------------------------------------

/**
 * Upsert the player's save to the server.
 * Also refreshes their leaderboard row -- note the server clamps the submitted
 * xp to save_state.xp via a trigger, so this can't be used to fake a score.
 */
export async function pushSave(s: GameState): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const uid = await currentUserId();
  if (!uid) return false;

  try {
    const { error } = await supabase.from('save_state').upsert(
      {
        user_id: uid,
        payload: s,
        xp: Math.max(0, Math.round(s.totalXP || 0)),
        level: Math.max(1, Math.round(s.level || 1)),
        gold: Math.max(0, Math.round(s.gold || 0)),
        power: Math.max(0, Math.round(computePower(s))),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) return false;

    // Keep the leaderboard row in step. Must run AFTER save_state is written,
    // because the trigger reads save_state.xp to validate the score.
    await supabase.from('leaderboard').upsert(
      { season: 'current', user_id: uid, xp: Math.max(0, Math.round(s.totalXP || 0)) },
      { onConflict: 'season,user_id' },
    );
    return true;
  } catch {
    return false;
  }
}

/** Pull the cloud save, if any. Used to restore after a reinstall. */
export async function pullSave(): Promise<GameState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from('save_state')
      .select('payload, updated_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error || !data?.payload) return null;
    return data.payload as GameState;
  } catch {
    return null;
  }
}

/** When was the cloud save last written? Lets the caller pick the newer copy. */
export async function cloudSaveTimestamp(): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from('save_state')
      .select('updated_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error || !data?.updated_at) return null;
    return new Date(data.updated_at).getTime();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  userId: string;
  name: string;
  xp: number;
  isMe: boolean;
}

/**
 * Top players this season, with real display names.
 *
 * profiles is read-own under RLS, so the client cannot join names itself.
 * The leaderboard_top() SECURITY DEFINER function is the one narrow hole:
 * it returns ONLY (user_id, display_name, xp) and nothing else.
 *
 * If the function is missing (schema not migrated yet) we fall back to
 * reading the leaderboard table directly and rendering anonymous handles,
 * so an un-migrated backend degrades instead of showing an empty board.
 */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const me = await currentUserId();

  try {
    const { data, error } = await supabase.rpc('leaderboard_top', { p_limit: limit });
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        userId: r.user_id,
        xp: Number(r.xp) || 0,
        isMe: r.user_id === me,
        name: r.display_name || `Hunter-${String(r.user_id).slice(0, 4).toUpperCase()}`,
      }));
    }
  } catch {
    // fall through to the legacy path
  }

  // Fallback: anonymous handles.
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id, xp')
      .eq('season', 'current')
      .order('xp', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => ({
      userId: r.user_id,
      xp: Number(r.xp) || 0,
      isMe: r.user_id === me,
      name: r.user_id === me ? 'You' : `Hunter-${String(r.user_id).slice(0, 4).toUpperCase()}`,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Profile + creator submissions
// ---------------------------------------------------------------------------

/** Keep the server profile in step with the local character. */
export async function upsertProfile(displayName: string, classId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const uid = await currentUserId();
  if (!uid) return false;
  try {
    const { error } = await supabase.from('profiles').upsert(
      { id: uid, display_name: displayName, class_id: classId, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
    return !error;
  } catch {
    return false;
  }
}

/** Submit a creator video for review. Returns a real success flag now. */
export async function submitCreatorVideo(url: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected' };
  const user = await currentUser();
  if (!user) return { ok: false, error: 'Sign in first' };
  try {
    const { error } = await supabase.from('creator_reviews').insert({
      user_id: user.id,
      email: user.email,
      video_url: url,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Submission failed' };
  }
}
