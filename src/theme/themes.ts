// 4 Epic Gamified UI Themes for FORGE
// Solo Hunter · Abyssal Berserker · Cyber Overclock · Divine Paladin

export type ThemeId = 'solo' | 'berserker' | 'cyberpunk' | 'paladin';

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bg2: string;
  bg3: string;

  // Cards & Surfaces
  card: string;
  card2: string;
  card3: string;
  glass: string;

  // Text
  ink: string;
  ink2: string;
  mut: string;
  mut2: string;
  mut3: string;

  // Primary Colors
  gold: string;
  goldDim: string;
  xpa: string;
  xpaDim: string;
  hp: string;
  hpDim: string;
  en: string;
  enDim: string;
  mana: string;
  manaDim: string;

  // Stats
  str: string;
  vig: string;
  vit: string;
  flx: string;
  foc: string;

  // Accents
  accent: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;

  // Anime "system" palette
  sys: string;
  sysDim: string;
  sysDeep: string;
  sysGlow: string;
  sysFaint: string;
  violet: string;
  violetGlow: string;
  crimson: string;

  // Borders & Lines
  line: string;
  line2: string;
  glow: string;

  // Rarity Tiers
  common: string;
  rare: string;
  epic: string;
  legendary: string;
  mythic: string;

  // Gradients
  gradientGold: string[];
  gradientXP: string[];
  gradientHP: string[];
  gradientMana: string[];
  gradientDark: string[];
  gradientSys: string[];
}

export interface ThemeShadows {
  sm: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  md: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  lg: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  glow: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  sysGlow: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subtitle: string;
  badge: string;
  icon: string;
  quote: string;
  desc: string;
  colors: ThemeColors;
  rankAura: Record<string, string>;
  shadows: ThemeShadows;
  preview: {
    primary: string;
    secondary: string;
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

function makeShadows(colors: ThemeColors): ThemeShadows {
  return {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      elevation: 0,
    },
    sysGlow: {
      shadowColor: colors.sys,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.65,
      shadowRadius: 14,
      elevation: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 1. SOLO HUNTER (The System / Shadow Monarch)
// ---------------------------------------------------------------------------
const soloColors: ThemeColors = {
  bg: '#07080f',
  bg2: '#0d1020',
  bg3: '#151a33',
  card: '#141830',
  card2: '#1c2244',
  card3: '#28305c',
  glass: 'rgba(20, 24, 48, 0.88)',

  ink: '#eaf0ff',
  ink2: '#c9d4f5',
  mut: '#8b93c0',
  mut2: '#5d6591',
  mut3: '#3b4270',

  gold: '#ffd166',
  goldDim: '#cca752',
  xpa: '#7cffb2',
  xpaDim: '#64e095',
  hp: '#ff5d73',
  hpDim: '#e04a5f',
  en: '#4dc3ff',
  enDim: '#3da8e0',
  mana: '#b18cff',
  manaDim: '#9575d6',

  str: '#ff8a5c',
  vig: '#4dc3ff',
  vit: '#7cffb2',
  flx: '#ffd166',
  foc: '#b18cff',

  accent: '#5ef2ff',
  accent2: '#ff8a5c',
  success: '#37e08a',
  warning: '#ffb84d',
  danger: '#e0344c',

  sys: '#5ef2ff',
  sysDim: '#2bb8cc',
  sysDeep: '#0b3d4d',
  sysGlow: 'rgba(94, 242, 255, 0.55)',
  sysFaint: 'rgba(94, 242, 255, 0.12)',
  violet: '#8b5cf6',
  violetGlow: 'rgba(139, 92, 246, 0.45)',
  crimson: '#ff2d55',

  line: 'rgba(255, 255, 255, 0.08)',
  line2: 'rgba(255, 255, 255, 0.14)',
  glow: 'rgba(94, 242, 255, 0.35)',

  common: '#9fb0c8',
  rare: '#4dc3ff',
  epic: '#b18cff',
  legendary: '#ffd166',
  mythic: '#ff4d8f',

  gradientGold: ['#ffd166', '#ffaa5c'],
  gradientXP: ['#7cffb2', '#4dc3ff'],
  gradientHP: ['#ff5d73', '#ff8a5c'],
  gradientMana: ['#b18cff', '#4dc3ff'],
  gradientDark: ['#141830', '#0d1020'],
  gradientSys: ['#5ef2ff', '#8b5cf6'],
};

const soloRankAura: Record<string, string> = {
  F: '#9fb0c8',
  E: '#7d8799',
  D: '#7cffb2',
  C: '#4dc3ff',
  B: '#b18cff',
  A: '#ffd166',
  S: '#ff8a5c',
  SS: '#ff2d55',
  SSS: '#ff2d55',
  NATIONAL: '#5ef2ff',
  MONARCH: '#ffffff',
};

// ---------------------------------------------------------------------------
// 2. ABYSSAL BERSERKER (Blood Realm / Hellfire Domain)
// ---------------------------------------------------------------------------
const berserkerColors: ThemeColors = {
  bg: '#0a0407',
  bg2: '#15080e',
  bg3: '#230c17',
  card: '#1c0913',
  card2: '#2a0d1d',
  card3: '#3d132a',
  glass: 'rgba(28, 9, 19, 0.90)',

  ink: '#fff0f3',
  ink2: '#f7ccd5',
  mut: '#b3808c',
  mut2: '#7e525d',
  mut3: '#4d2d35',

  gold: '#ffb703',
  goldDim: '#cc9202',
  xpa: '#ff9f1c',
  xpaDim: '#d67f0f',
  hp: '#ff2a55',
  hpDim: '#cc1b40',
  en: '#fb5607',
  enDim: '#c44304',
  mana: '#d946ef',
  manaDim: '#ae32c0',

  str: '#ff3838',
  vig: '#fb5607',
  vit: '#ff9f1c',
  flx: '#ffb703',
  foc: '#d946ef',

  accent: '#ff2a55',
  accent2: '#ff9f1c',
  success: '#2ec4b6',
  warning: '#ff9f1c',
  danger: '#ff0033',

  sys: '#ff2a55',
  sysDim: '#cc1b40',
  sysDeep: '#4a0815',
  sysGlow: 'rgba(255, 42, 85, 0.60)',
  sysFaint: 'rgba(255, 42, 85, 0.16)',
  violet: '#d946ef',
  violetGlow: 'rgba(217, 70, 239, 0.50)',
  crimson: '#ff0033',

  line: 'rgba(255, 42, 85, 0.14)',
  line2: 'rgba(255, 42, 85, 0.22)',
  glow: 'rgba(255, 42, 85, 0.40)',

  common: '#a89297',
  rare: '#fb5607',
  epic: '#d946ef',
  legendary: '#ffb703',
  mythic: '#ff0033',

  gradientGold: ['#ffb703', '#fb5607'],
  gradientXP: ['#ff9f1c', '#ff2a55'],
  gradientHP: ['#ff2a55', '#9e0024'],
  gradientMana: ['#d946ef', '#ff2a55'],
  gradientDark: ['#1c0913', '#15080e'],
  gradientSys: ['#ff2a55', '#d946ef'],
};

const berserkerRankAura: Record<string, string> = {
  F: '#8c7b80',
  E: '#a89297',
  D: '#ff9f1c',
  C: '#fb5607',
  B: '#d946ef',
  A: '#ffb703',
  S: '#ff3838',
  SS: '#ff0033',
  SSS: '#ff0033',
  NATIONAL: '#ff2a55',
  MONARCH: '#ffffff',
};

// ---------------------------------------------------------------------------
// 3. CYBERPUNK OVERCLOCK (Neo-Tokyo Synthwave / Matrix Grid)
// ---------------------------------------------------------------------------
const cyberpunkColors: ThemeColors = {
  bg: '#060211',
  bg2: '#0d0522',
  bg3: '#17093b',
  card: '#12072e',
  card2: '#1e0c4a',
  card3: '#2e126e',
  glass: 'rgba(18, 7, 46, 0.90)',

  ink: '#faf5ff',
  ink2: '#e2d1f7',
  mut: '#9d88c2',
  mut2: '#675488',
  mut3: '#3e3057',

  gold: '#ffe600',
  goldDim: '#ccb800',
  xpa: '#00ff9d',
  xpaDim: '#00cc7e',
  hp: '#ff0055',
  hpDim: '#cc0044',
  en: '#00f0ff',
  enDim: '#00b8c4',
  mana: '#b026ff',
  manaDim: '#8d1dcc',

  str: '#ff007f',
  vig: '#00f0ff',
  vit: '#00ff9d',
  flx: '#ffe600',
  foc: '#b026ff',

  accent: '#ff007f',
  accent2: '#00ff9d',
  success: '#00ff9d',
  warning: '#ffe600',
  danger: '#ff0055',

  sys: '#ff007f',
  sysDim: '#cc0066',
  sysDeep: '#4d0027',
  sysGlow: 'rgba(255, 0, 127, 0.60)',
  sysFaint: 'rgba(255, 0, 127, 0.16)',
  violet: '#b026ff',
  violetGlow: 'rgba(176, 38, 255, 0.50)',
  crimson: '#ff0055',

  line: 'rgba(255, 0, 127, 0.15)',
  line2: 'rgba(0, 240, 255, 0.20)',
  glow: 'rgba(255, 0, 127, 0.40)',

  common: '#8f80a8',
  rare: '#00f0ff',
  epic: '#b026ff',
  legendary: '#ffe600',
  mythic: '#ff007f',

  gradientGold: ['#ffe600', '#ff007f'],
  gradientXP: ['#00ff9d', '#00f0ff'],
  gradientHP: ['#ff0055', '#b026ff'],
  gradientMana: ['#b026ff', '#00f0ff'],
  gradientDark: ['#12072e', '#0d0522'],
  gradientSys: ['#ff007f', '#00f0ff'],
};

const cyberpunkRankAura: Record<string, string> = {
  F: '#8f80a8',
  E: '#a99ac0',
  D: '#00ff9d',
  C: '#00f0ff',
  B: '#b026ff',
  A: '#ffe600',
  S: '#ff007f',
  SS: '#ff0055',
  SSS: '#ff0055',
  NATIONAL: '#00f0ff',
  MONARCH: '#ffffff',
};

// ---------------------------------------------------------------------------
// 4. DIVINE PALADIN (Holy Monarch / Celestial Sanctum)
// ---------------------------------------------------------------------------
const paladinColors: ThemeColors = {
  bg: '#050813',
  bg2: '#0a1022',
  bg3: '#111b36',
  card: '#0d152c',
  card2: '#132142',
  card3: '#1d315f',
  glass: 'rgba(13, 21, 44, 0.90)',

  ink: '#f8fafc',
  ink2: '#dce5f2',
  mut: '#8fa1be',
  mut2: '#576885',
  mut3: '#323f54',

  gold: '#fbbf24',
  goldDim: '#d97706',
  xpa: '#34d399',
  xpaDim: '#10b981',
  hp: '#f43f5e',
  hpDim: '#e11d48',
  en: '#38bdf8',
  enDim: '#0284c7',
  mana: '#a78bfa',
  manaDim: '#7c3aed',

  str: '#fb923c',
  vig: '#38bdf8',
  vit: '#34d399',
  flx: '#fbbf24',
  foc: '#a78bfa',

  accent: '#fbbf24',
  accent2: '#38bdf8',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f43f5e',

  sys: '#fbbf24',
  sysDim: '#d97706',
  sysDeep: '#452603',
  sysGlow: 'rgba(251, 191, 36, 0.60)',
  sysFaint: 'rgba(251, 191, 36, 0.16)',
  violet: '#a78bfa',
  violetGlow: 'rgba(167, 139, 250, 0.45)',
  crimson: '#f43f5e',

  line: 'rgba(251, 191, 36, 0.14)',
  line2: 'rgba(56, 189, 248, 0.20)',
  glow: 'rgba(251, 191, 36, 0.40)',

  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#a78bfa',
  legendary: '#fbbf24',
  mythic: '#f43f5e',

  gradientGold: ['#fbbf24', '#f59e0b'],
  gradientXP: ['#34d399', '#38bdf8'],
  gradientHP: ['#f43f5e', '#fb923c'],
  gradientMana: ['#a78bfa', '#38bdf8'],
  gradientDark: ['#0d152c', '#0a1022'],
  gradientSys: ['#fbbf24', '#38bdf8'],
};

const paladinRankAura: Record<string, string> = {
  F: '#94a3b8',
  E: '#cbd5e1',
  D: '#34d399',
  C: '#38bdf8',
  B: '#a78bfa',
  A: '#fbbf24',
  S: '#fb923c',
  SS: '#f43f5e',
  SSS: '#f43f5e',
  NATIONAL: '#fbbf24',
  MONARCH: '#ffffff',
};

// ---------------------------------------------------------------------------
// THEME REGISTRY
// ---------------------------------------------------------------------------
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  solo: {
    id: 'solo',
    name: 'Solo Hunter',
    subtitle: 'The System Awakening',
    badge: 'SYSTEM HUD',
    icon: '⚡',
    quote: 'You have received a quest from the System.',
    desc: 'Deep obsidian void, holographic electric cyan HUD, and shadow monarch violet aura.',
    colors: soloColors,
    rankAura: soloRankAura,
    shadows: makeShadows(soloColors),
    preview: {
      primary: '#5ef2ff',
      secondary: '#8b5cf6',
      bg: '#07080f',
      card: '#141830',
      accent: '#ffd166',
      text: '#eaf0ff',
    },
  },
  berserker: {
    id: 'berserker',
    name: 'Abyssal Berserker',
    subtitle: 'Blood & Hellfire Domain',
    badge: 'WARRIOR DOMAIN',
    icon: '🩸',
    quote: 'Forge your flesh in the crucible of blood and iron.',
    desc: 'Infernal charcoal black, blood-forged crimson lasers, molten magma amber, and demonic power.',
    colors: berserkerColors,
    rankAura: berserkerRankAura,
    shadows: makeShadows(berserkerColors),
    preview: {
      primary: '#ff2a55',
      secondary: '#ff9f1c',
      bg: '#0a0407',
      card: '#1c0913',
      accent: '#ffb703',
      text: '#fff0f3',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Overclock',
    subtitle: 'Neo-Tokyo Matrix Grid',
    badge: 'SYNTHWAVE ARCADE',
    icon: '👾',
    quote: 'Break the biological limiter. Overclock your meatware.',
    desc: 'Midnight synthwave matrix, neon laser magenta, toxic acid lime, and high-voltage cyan.',
    colors: cyberpunkColors,
    rankAura: cyberpunkRankAura,
    shadows: makeShadows(cyberpunkColors),
    preview: {
      primary: '#ff007f',
      secondary: '#00ff9d',
      bg: '#060211',
      card: '#12072e',
      accent: '#00f0ff',
      text: '#faf5ff',
    },
  },
  paladin: {
    id: 'paladin',
    name: 'Divine Paladin',
    subtitle: 'Holy Monarch Ascension',
    badge: 'SACRED SANCTUARY',
    icon: '👑',
    quote: 'Bathed in celestial radiance, ascend past mortality.',
    desc: 'Imperial midnight sapphire navy, celestial radiant gold, sacred jade, and archangel aura.',
    colors: paladinColors,
    rankAura: paladinRankAura,
    shadows: makeShadows(paladinColors),
    preview: {
      primary: '#fbbf24',
      secondary: '#38bdf8',
      bg: '#050813',
      card: '#0d152c',
      accent: '#34d399',
      text: '#f8fafc',
    },
  },
};

export const THEME_LIST: ThemeDefinition[] = Object.values(THEMES);

export const DEFAULT_THEME_ID: ThemeId = 'solo';

let currentActiveThemeId: ThemeId = DEFAULT_THEME_ID;

export function setActiveThemeId(id: ThemeId) {
  if (id in THEMES) {
    currentActiveThemeId = id;
  }
}

export function getActiveThemeId(): ThemeId {
  return currentActiveThemeId;
}

export function getTheme(id?: string | null): ThemeDefinition {
  if (id && id in THEMES) {
    return THEMES[id as ThemeId];
  }
  return THEMES[currentActiveThemeId] || THEMES[DEFAULT_THEME_ID];
}

export function getThemeColors(id?: string | null): ThemeColors {
  return getTheme(id).colors;
}

export function getThemeRankAura(id?: string | null): Record<string, string> {
  return getTheme(id).rankAura;
}
