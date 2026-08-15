// Global game state via Zustand. Persists to AsyncStorage.
import { create } from 'zustand';
import { GameState, ENGINE } from '../engine';
import { loadGame, saveGame } from '../services/storage';

interface GameStore {
  state: GameState | null;
  hydrated: boolean;
  notifications: string[];
  hydrate: () => Promise<void>;
  newGame: (name: string, clsId: string) => void;
  mutate: (fn: (s: GameState) => void) => void;
  notify: (msg: string) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  state: null,
  hydrated: false,
  notifications: [],

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
    fn(s);
    // run all achievement checks after any mutation
    const newly = ENGINE.checkAchievements(s);
    if (newly.length) {
      set({ notifications: [...get().notifications, ...newly.map(a => `🎖️ Achievement: ${a.name}!`) ] });
    }
    ENGINE.dayReset(s);
    ENGINE.recordDay(s);
    const msgs = get().notifications;
    set({ state: { ...s }, notifications: msgs });
    saveGame(s);
  },

  notify(msg) {
    set({ notifications: [...get().notifications, msg] });
  },
}));
