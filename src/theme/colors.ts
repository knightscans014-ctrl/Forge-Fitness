import {
  THEMES,
  THEME_LIST,
  ThemeId,
  ThemeColors,
  ThemeDefinition,
  ThemeShadows,
  DEFAULT_THEME_ID,
  getTheme,
  getThemeColors,
  getThemeRankAura,
  setActiveThemeId,
  getActiveThemeId,
} from './themes';

export {
  THEMES,
  THEME_LIST,
  ThemeId,
  ThemeColors,
  ThemeDefinition,
  ThemeShadows,
  DEFAULT_THEME_ID,
  getTheme,
  getThemeColors,
  getThemeRankAura,
  setActiveThemeId,
  getActiveThemeId,
};

// Proxied colors object: any static or dynamic property access gets the current theme's color!
export const colors: ThemeColors = new Proxy({} as ThemeColors, {
  get(_target, prop: string | symbol) {
    const current = THEMES[getActiveThemeId()]?.colors || THEMES[DEFAULT_THEME_ID].colors;
    return (current as unknown as Record<string | symbol, string | string[]>)[prop];
  },
  ownKeys(_target) {
    const current = THEMES[getActiveThemeId()]?.colors || THEMES[DEFAULT_THEME_ID].colors;
    return Reflect.ownKeys(current);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const current = THEMES[getActiveThemeId()]?.colors || THEMES[DEFAULT_THEME_ID].colors;
    return Object.getOwnPropertyDescriptor(current, prop);
  },
});

// Proxied rankAura mapping: dynamically resolves to current theme's aura mapping!
export const rankAura: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string | symbol) {
    const current = THEMES[getActiveThemeId()]?.rankAura || THEMES[DEFAULT_THEME_ID].rankAura;
    return (current as Record<string | symbol, string>)[prop] || current['F'] || (THEMES[getActiveThemeId()]?.colors || THEMES[DEFAULT_THEME_ID].colors).sys;
  },
  ownKeys(_target) {
    const current = THEMES[getActiveThemeId()]?.rankAura || THEMES[DEFAULT_THEME_ID].rankAura;
    return Reflect.ownKeys(current);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const current = THEMES[getActiveThemeId()]?.rankAura || THEMES[DEFAULT_THEME_ID].rankAura;
    return Object.getOwnPropertyDescriptor(current, prop);
  },
});

// Proxied shadows: dynamically resolves to current theme's shadows!
export const shadows: ThemeShadows = new Proxy({} as ThemeShadows, {
  get(_target, prop: string | symbol) {
    const current = THEMES[getActiveThemeId()]?.shadows || THEMES[DEFAULT_THEME_ID].shadows;
    return (current as unknown as Record<string | symbol, unknown>)[prop];
  },
  ownKeys(_target) {
    const current = THEMES[getActiveThemeId()]?.shadows || THEMES[DEFAULT_THEME_ID].shadows;
    return Reflect.ownKeys(current);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const current = THEMES[getActiveThemeId()]?.shadows || THEMES[DEFAULT_THEME_ID].shadows;
    return Object.getOwnPropertyDescriptor(current, prop);
  },
});

// Typographic scale for the "system" look: wide tracking, heavy weights.
export const type = {
  systemLabel: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 3, textTransform: 'uppercase' as const },
  display: { fontSize: 34, fontWeight: '900' as const, letterSpacing: 1 },
  title: { fontSize: 19, fontWeight: '900' as const },
  body: { fontSize: 13, fontWeight: '600' as const },
};
