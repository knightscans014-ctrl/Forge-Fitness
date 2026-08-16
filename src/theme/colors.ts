export const colors = {
  // Backgrounds
  bg: '#0b0d17',
  bg2: '#12152a',
  bg3: '#1a1f3a',
  
  // Cards & Surfaces
  card: '#181c33',
  card2: '#1f2440',
  card3: '#2a3050',
  glass: 'rgba(24, 28, 51, 0.85)',
  
  // Text
  ink: '#e9ecff',
  ink2: '#d0d5f0',
  mut: '#8b91b8',
  mut2: '#5c6185',
  mut3: '#3d4165',
  
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
  gradientDark: ['#181c33', '#12152a'],
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
};
