// Global game state via Zustand. Persists to AsyncStorage.
import { create } from 'zustand';
import { GameState, ENGINE } from '../engine';
import { loadGame, saveGame } from '../services/storage';
import { colors } from '../theme/colors';

interface GameStore {
  state: GameState | null;
  hydrated: boolean;
  notifications: string[];
  celebration: { title: string; big: string; subtitle?: string; accent?: string } | null;
  hydrate: () => Promise<void>;
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

  newGame(name, clsId) {
    const s = ENGINE.newGame(name, clsId);
    set({ state: s });
    saveGame(s);
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
    set({ state: { ...s }, notifications: msgs });
    saveGame(s);
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
