export const colors = {
  // Backgrounds — deep "system window" void
  bg: '#07080f',
  bg2: '#0d1020',
  bg3: '#151a33',

  // Cards & Surfaces
  card: '#141830',
  card2: '#1c2244',
  card3: '#28305c',
  glass: 'rgba(20, 24, 48, 0.88)',

  // Text
  ink: '#eaf0ff',
  ink2: '#c9d4f5',
  mut: '#8b93c0',
  mut2: '#5d6591',
  mut3: '#3b4270',

  // Primary Colors
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

  // Stats
  str: '#ff8a5c',
  vig: '#4dc3ff',
  vit: '#7cffb2',
  flx: '#ffd166',
  foc: '#b18cff',

  // Accents
  accent: '#ff5d73',
  accent2: '#ff8a5c',
  success: '#37e08a',
  warning: '#ffb84d',
  danger: '#e0344c',

  // ---- Anime "system" palette ----
  // The cyan is the signature UI colour: system windows, scan lines, borders.
  sys: '#5ef2ff',
  sysDim: '#2bb8cc',
  sysDeep: '#0b3d4d',
  sysGlow: 'rgba(94, 242, 255, 0.55)',
  sysFaint: 'rgba(94, 242, 255, 0.12)',
  violet: '#8b5cf6',
  violetGlow: 'rgba(139, 92, 246, 0.45)',
  crimson: '#ff2d55',

  // Borders & Lines
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.12)',
  glow: 'rgba(255, 209, 102, 0.3)',

  // Rarity Tiers
  common: '#9fb0c8',
  rare: '#4dc3ff',
  epic: '#b18cff',
  legendary: '#ffd166',
  mythic: '#ff4d8f',

  // Gradients (as arrays for linear-gradient)
  gradientGold: ['#ffd166', '#ffaa5c'],
  gradientXP: ['#7cffb2', '#4dc3ff'],
  gradientHP: ['#ff5d73', '#ff8a5c'],
  gradientMana: ['#b18cff', '#4dc3ff'],
  gradientDark: ['#141830', '#0d1020'],
  gradientSys: ['#5ef2ff', '#8b5cf6'],
};

// Rank -> aura colour, used by portraits and system windows.
export const rankAura: Record<string, string> = {
  E: '#7d8799',
  D: '#7cffb2',
  C: '#4dc3ff',
  B: '#b18cff',
  A: '#ffd166',
  S: '#ff8a5c',
  SS: '#ff2d55',
};

// Shadow configurations
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 0,
  },
  sysGlow: {
    shadowColor: colors.sys,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 0,
  },
};

// Typographic scale for the "system" look: wide tracking, heavy weights.
export const type = {
  systemLabel: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 3, textTransform: 'uppercase' as const },
  display: { fontSize: 34, fontWeight: '900' as const, letterSpacing: 1 },
  title: { fontSize: 19, fontWeight: '900' as const },
  body: { fontSize: 13, fontWeight: '600' as const },
};
