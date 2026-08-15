// Supabase sync service — multiplayer persistence + leaderboard.
// Backed by the schema in supabase/schema.sql.
//
// NOTE: requires installing `@supabase/supabase-js` and setting env vars:
//   EXPO_PUBLIC_SUPABASE_URL
//   EXPO_PUBLIC_SUPABASE_ANON_KEY
// In the prototype this is a typed stub; wire real calls when the backend is live.

import { GameState } from '../engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

export function initSync(url: string, anonKey: string): void {
  // In prod: import { createClient } from '@supabase/supabase-js';
  // client = createClient(url, anonKey);
  void url; void anonKey;
}

export async function pushSave(s: GameState): Promise<boolean> {
  if (!client) return false;
  // In prod:
  // await client.from('save_state').upsert({ user_id, payload: s, xp: s.totalXP, level: s.level, gold: s.gold, power: computePower(s) });
  return false;
}

export async function fetchLeaderboard(): Promise<{ name: string; xp: number }[]> {
  if (!client) return [];
  return [];
}

export async function submitCreatorVideo(email: string, url: string): Promise<boolean> {
  if (!client) return true; // prototype returns success
  // In prod:
  // await client.from('creator_reviews').insert({ user_id, email, video_url: url });
  return true;
}
