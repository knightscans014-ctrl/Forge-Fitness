// Icon name tables, kept free of JSX so they can be unit-tested under the
// engine's plain-TypeScript jest project.
//
// `family` is optional and defaults to Ionicons. That default is a trap: a
// MaterialCommunityIcons-only name with no family renders as a tofu box and
// nothing -- not TypeScript, not the bundler -- complains. icons.test.ts
// checks every entry here against the real glyph maps.

export type IconFamily = 'ion' | 'mci';

// ---- Tab bar icons (active/inactive variants) ----
export const TAB_ICONS: Record<string, { active: string; inactive: string; family?: 'ion' | 'mci' }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  // Key must match the tab's route name in App.tsx (TABS), not the screen
  // component's filename -- the screen is MissionsScreen but the route is 'Quests'.
  Quests: { active: 'list-circle', inactive: 'list-circle-outline' },
  Battle: { active: 'sword', inactive: 'sword', family: 'mci' },
  Character: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  Plan: { active: 'clipboard', inactive: 'clipboard-outline' },
  Log: { active: 'flash', inactive: 'flash-outline' },
  Trials: { active: 'sword', inactive: 'sword' , family: 'mci' },
  Progress: { active: 'chart-box', inactive: 'chart-box-outline', family: 'mci' },
  Shop: { active: 'store', inactive: 'store-outline', family: 'mci' },
};

// ---- Semantic icon map for content (classes, stats, actions) ----
export const ICONS: Record<string, { name: string; family?: 'ion' | 'mci' }> = {
  // classes
  warrior: { name: 'shield', family: 'mci' },
  ranger: { name: 'bow-arrow', family: 'mci' },
  monk: { name: 'meditation', family: 'mci' },
  mage: { name: 'auto-fix', family: 'mci' },
  assassin: { name: 'knife', family: 'mci' },
  paladin: { name: 'sword-cross', family: 'mci' },
  // stats
  str: { name: 'weight-lifter', family: 'mci' },
  vig: { name: 'speedometer' },
  vit: { name: 'heart' },
  flx: { name: 'accessibility' },
  foc: { name: 'brain', family: 'mci' },
  // activities
  strength: { name: 'barbell' },
  cardio: { name: 'run', family: 'mci' },
  steps: { name: 'walk' },
  mobility: { name: 'yoga', family: 'mci' },
  meditation: { name: 'meditation', family: 'mci' },
  recovery: { name: 'bed', family: 'mci' },
  // currencies / resources
  gold: { name: 'circle-multiple', family: 'mci' },
  xp: { name: 'star' },
  energy: { name: 'flash' },
  hp: { name: 'heart' },
  // actions / nav
  quest: { name: 'clipboard-list', family: 'mci' },
  boss: { name: 'skull', family: 'mci' },
  loot: { name: 'package-variant-closed', family: 'mci' },
  boost: { name: 'rocket' },
  gear: { name: 'shield-half-full', family: 'mci' },
  streak: { name: 'flame' },
  rank: { name: 'trophy' },
  bout: { name: 'sword', family: 'mci' },
  trial: { name: 'sword', family: 'mci' },
  season: { name: 'calendar-star', family: 'mci' },
  crown: { name: 'crown', family: 'mci' },
  lock: { name: 'lock-closed' },
  check: { name: 'checkmark-circle' },
  back: { name: 'chevron-back' },
  close: { name: 'close' },
  more: { name: 'ellipsis-horizontal' },
  settings: { name: 'settings' },
  notification: { name: 'notifications' },
  chevronRight: { name: 'chevron-forward' },
  sparkles: { name: 'sparkles' },
  water: { name: 'water' },
  sleep: { name: 'moon' },
  lightning: { name: 'flash' },
  play: { name: 'play-circle' },
  reload: { name: 'refresh' },
  shield: { name: 'shield-checkmark' },
  award: { name: 'medal', family: 'mci' },
};

export function icon(name: string): { name: string; family?: 'ion' | 'mci' } {
  return ICONS[name] || { name: 'help-circle' };
}
