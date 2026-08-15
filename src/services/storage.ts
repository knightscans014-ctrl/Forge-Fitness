// Persistence via AsyncStorage. Async by nature (native apps), unlike the web localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../engine';
import { SAVE_KEY, normalize } from '../engine';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return normalize(s);
  } catch (e) {
    return null;
  }
}

export async function saveGame(s: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {
    // ignore quota errors in dev
  }
}

export async function resetGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
}
