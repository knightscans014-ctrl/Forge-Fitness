import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useGame } from './GameContext';
import {
  THEMES,
  THEME_LIST,
  ThemeId,
  ThemeColors,
  ThemeDefinition,
  ThemeShadows,
  DEFAULT_THEME_ID,
  getTheme,
  setActiveThemeId,
} from '../theme/themes';

export interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  colors: ThemeColors;
  shadows: ThemeShadows;
  rankAura: Record<string, string>;
  themes: ThemeDefinition[];
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const state = useGame(s => s.state);
  const mutate = useGame(s => s.mutate);

  const themeId: ThemeId = (state?.theme && state.theme in THEMES) ? state.theme : DEFAULT_THEME_ID;

  // Sync memory proxy target with current state
  setActiveThemeId(themeId);

  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const setTheme = useCallback((newId: ThemeId) => {
    if (newId in THEMES) {
      setActiveThemeId(newId);
      mutate(s => {
        s.theme = newId;
      });
    }
  }, [mutate]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeId,
    theme,
    colors: theme.colors,
    shadows: theme.shadows,
    rankAura: theme.rankAura,
    themes: THEME_LIST,
    setTheme,
  }), [themeId, theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const fallbackTheme = getTheme(DEFAULT_THEME_ID);
    return {
      themeId: DEFAULT_THEME_ID,
      theme: fallbackTheme,
      colors: fallbackTheme.colors,
      shadows: fallbackTheme.shadows,
      rankAura: fallbackTheme.rankAura,
      themes: THEME_LIST,
      setTheme: () => {},
    };
  }
  return ctx;
}
