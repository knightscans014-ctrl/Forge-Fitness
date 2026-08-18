// Save export / import.
//
// Everything lives on the device, so if the app is uninstalled the save is
// gone. This gives players a way out: serialise the save to a text blob they
// can copy anywhere, and paste back to restore.
//
// The blob is deliberately plain JSON with a small envelope around it. No
// compression and no encryption — a player should be able to read and edit
// their own data, and a future version needs to be able to reason about the
// format version.

import { GameState, ENGINE } from '../engine';

export const SAVE_FORMAT = 1;

export interface SaveEnvelope {
  app: 'FORGE';
  format: number;
  exportedAt: string;
  state: GameState;
}

/** Serialise a save to a shareable string. */
export function exportSave(state: GameState): string {
  const env: SaveEnvelope = {
    app: 'FORGE',
    format: SAVE_FORMAT,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(env, null, 2);
}

export type ImportResult =
  | { ok: true; state: GameState; warning?: string }
  | { ok: false; error: string };

/**
 * Parse a previously exported blob back into a save.
 *
 * Accepts both the enveloped format and a bare GameState, since people will
 * inevitably paste the inner object or hand-edit the file. Anything that
 * parses is run through normalize(), which backfills missing fields, so a
 * partial or older save still loads rather than crashing the app.
 */
export function importSave(text: string): ImportResult {
  const trimmed = (text || '').trim();
  if (!trimmed) return { ok: false, error: 'Nothing to import — paste your save text first.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'That is not valid save text. Make sure you copied the whole thing, including the outer { }.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'That save text is not in a format FORGE understands.' };
  }

  const obj = parsed as Record<string, unknown>;
  let raw: Record<string, unknown>;
  let warning: string | undefined;

  if (obj.app === 'FORGE' && obj.state && typeof obj.state === 'object') {
    raw = obj.state as Record<string, unknown>;
    const fmt = typeof obj.format === 'number' ? obj.format : 0;
    if (fmt > SAVE_FORMAT) {
      warning = 'This save came from a newer version of FORGE. It loaded, but anything this version does not understand was dropped.';
    }
  } else if (typeof obj.name === 'string' && typeof obj.cls === 'string') {
    // Bare GameState — someone pasted the inner object.
    raw = obj;
  } else {
    return { ok: false, error: 'That does not look like a FORGE save.' };
  }

  if (typeof raw.name !== 'string' || typeof raw.cls !== 'string') {
    return { ok: false, error: 'That save is missing its hunter name or class, so it cannot be loaded.' };
  }
  if (typeof raw.level !== 'number' || typeof raw.totalXP !== 'number') {
    return { ok: false, error: 'That save is missing its level and XP, so it cannot be loaded.' };
  }

  try {
    const state = ENGINE.normalize(raw as unknown as GameState);
    return { ok: true, state, warning };
  } catch {
    return { ok: false, error: 'That save could not be repaired into a working game.' };
  }
}

/** Short human summary used to confirm an import before it overwrites anything. */
export function describeSave(state: GameState): string {
  return `${state.name} · Level ${state.level} · ${state.workouts} workouts · ${state.streak}-day streak`;
}
