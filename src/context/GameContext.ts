// Global game state via Zustand. Persists to AsyncStorage.
import { create } from 'zustand';
import { GameState, ENGINE } from '../engine';
import { loadGame, saveGame } from '../services/storage';
import { pushSave, pullSave, cloudSaveTimestamp, upsertProfile } from '../services/sync';
import { colors } from '../theme/colors';

// Cloud pushes are debounced: mutate() fires on every rep logged, and we do not
// want one network write per tap. Trailing-edge only, so the last state wins.
const CLOUD_PUSH_DELAY = 4000;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let cloudEnabled = false;

function schedulePush(s: GameState) {
  if (!cloudEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  const snapshot = JSON.parse(JSON.stringify(s)) as GameState;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    // Fire and forget: a failed cloud push must never break local play.
    pushSave(snapshot).catch(() => {});
  }, CLOUD_PUSH_DELAY);
}

/** Flush any pending cloud write immediately (e.g. on sign-out/background). */
export async function flushCloudSave(): Promise<void> {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  const s = useGame.getState().state;
  if (cloudEnabled && s) { try { await pushSave(s); } catch { /* ignore */ } }
}

interface GameStore {
  state: GameState | null;
  hydrated: boolean;
  notifications: string[];
  celebration: { title: string; big: string; subtitle?: string; accent?: string } | null;
  hydrate: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  newGame: (name: string, clsId: string) => void;
  mutate: (fn: (s: GameState) => void) => void;
  notify: (msg: string) => void;
  celebrate: (c: { title: string; big: string; subtitle?: string; accent?: string }) => void;
  clearCelebration: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  state: null,
  hydrated: false,
  notifications: [],
  celebration: null,

  async hydrate() {
    const s = await loadGame();
    set({ state: s, hydrated: true });
  },

  // Called once the user is signed in. Picks whichever copy is newer -- the
  // cloud save or this device's -- so reinstalling the app restores progress
  // and playing offline is not clobbered by a stale cloud row.
  async syncWithCloud() {
    cloudEnabled = true;
    const local = get().state;
    try {
      const cloudTs = await cloudSaveTimestamp();
      const localTs = local?.updatedAt ?? 0;

      if (cloudTs && cloudTs > localTs) {
        const remote = await pullSave();
        if (remote) {
          ENGINE.normalize(remote);
          set({ state: remote });
          await saveGame(remote);
          get().notify('Cloud save restored.');
          return;
        }
      }
      if (local) {
        await upsertProfile(local.name, local.cls).catch(() => false);
        await pushSave(local);
      }
    } catch {
      // Offline or backend down: keep playing locally.
    }
  },

  newGame(name, clsId) {
    const s = ENGINE.newGame(name, clsId);
    s.updatedAt = Date.now();
    set({ state: s });
    saveGame(s);
    // Publish the display name so the player shows up by name on the
    // leaderboard instead of an anonymous handle.
    upsertProfile(name, clsId).catch(() => {});
    schedulePush(s);
  },

  mutate(fn) {
    const s = get().state;
    if (!s) return;
    ENGINE.normalize(s);
    ENGINE.dayReset(s);
    ENGINE.currentSeason(s); // ensure season active
    const levelBefore = s.level;
    const rankBefore = ENGINE.rankForLevel(levelBefore).id;
    const bossesBefore = s.bosses.length;
    fn(s);
    // run all achievement checks after any mutation
    const newly = ENGINE.checkAchievements(s);
    if (newly.length) {
      set({ notifications: [...get().notifications, ...newly.map(a => `🎖️ Achievement: ${a.name}!`) ] });
    }
    ENGINE.dayReset(s);
    ENGINE.recordDay(s);
    // celebrations for level-ups / rank-ups / boss kills
    if (s.level > levelBefore) {
      const rankNow = ENGINE.rankForLevel(s.level).id;
      if (rankNow !== rankBefore) {
        const rk = ENGINE.rankForLevel(s.level);
        get().celebrate({ title: 'THE SYSTEM PROMOTES YOU', big: `${rk.id}-RANK`, subtitle: rk.title, accent: rk.color });
      } else {
        get().celebrate({ title: 'You have grown', big: `LEVEL ${s.level}`, accent: colors.gold });
      }
    } else if (s.bosses.length > bossesBefore) {
      get().celebrate({ title: 'Boss Slain', big: 'VICTORY', subtitle: 'The realm remembers your might', accent: colors.mana });
    }
    const msgs = get().notifications;
    s.updatedAt = Date.now();
    set({ state: { ...s }, notifications: msgs });
    saveGame(s);
    schedulePush(s);
  },

  notify(msg) {
    set({ notifications: [...get().notifications, msg] });
  },
  celebrate(c) {
    set({ celebration: c });
  },
  clearCelebration() {
    set({ celebration: null });
  },
}));
