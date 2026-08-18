// Core domain types for the FORGE game engine.

export type StatId = 'str' | 'vig' | 'vit' | 'flx' | 'foc';

export interface PlayerStats {
  str: number;
  vig: number;
  vit: number;
  flx: number;
  foc: number;
}

export interface ClassDef {
  id: string;
  icon: string;
  name: string;
  color: string;
  desc: string;
  bonus: Partial<PlayerStats>;
}

export interface GameState {
  name: string;
  cls: string;
  created: number;
  /** Epoch ms of the last local mutation. */
  updatedAt?: number;
  /** Chosen difficulty path (see PREMIUM_TIERS). Free to change anytime. */
  tier: string | null;

  level: number;
  totalXP: number;
  gold: number;

  hp: number;
  maxHP: number;
  energy: number;
  maxEnergy: number;
  energyRegenAt: string;

  stats: PlayerStats;
  statGrowth: PlayerStats;
  skillPoints: number;
  skills: Record<string, number>;

  questsDone: string[];
  dayDone: string;

  activities: { icon: string; name: string; xp: number; time: string }[];
  workouts: number;
  totalWorkoutMin: number;

  stepsToday: number;
  waterToday: number;
  sleepHours: number;

  streak: number;
  lastActiveDay: string;
  bestStreak: number;

  bosses: string[];
  totalWater: number;
  achievements: string[];
  owned: Record<string, boolean>;
  bonusSlots: number;
  xpMult: number;
  goldMult: number;
  bossDamage: number;

  inventory: GearItem[];
  equipped: { weapon?: string; armor?: string; accessory?: string };

  daily: { lastClaim: string | null; claimStreak: number };

  // v4 expansion
  weekKey: string;
  weekly: WeeklyProgress;
  story: Record<string, number[]>;
  milestones: MilestoneProgress;
  tiered: Record<string, number>;
  boosters: BoosterActive[];
  combo: { n: number; date: string };
  dailyChallenge: string;
  dailyChallengeDone: boolean;

  workoutsToday: number;
  stepsTodayAbs: number;
  strengthMinToday: number;
  cardioMinToday: number;
  meditationMinToday: number;
  statsTrainedToday: Record<string, number>;

  lastDay: string;
  lastCrit: boolean;

  // ---- v5 max systems ----
  bossBattle: BossBattleState | null;

  /** In-progress live workout session, survives app restarts. */
  liveSession?: import('./session').LiveSession | null;
  /** Lifetime live sessions started and won, for quests/achievements. */
  sessionsRun?: number;
  sessionWins?: number;
  bossesDefeated: number;
  suggestion: { id: string; icon: string; text: string; xp: number; gold: number; stat: string } | null;
  suggestionDone: boolean;
  weeklyTrial: WeeklyTrialState | null;
  season: SeasonInfo | null;
  seasonXP: number;
  history: DailyRecord[]; // capped rolling history for analytics
  stackProgress: Record<string, number>; // stackId -> steps completed today
  bouts: { opponent: string; wins: number }[];
  boutStreak: number;
}

export interface WeeklyProgress {
  workouts: number;
  stepsWeekly: number;
  minWeekly: number;
  waterWeekly: number;
  statsTrained: number;
  questsWeekly: number;
  claimed: string[];
}

export interface MilestoneProgress {
  workouts: number;
  streak: number;
  level: number;
  bossCount: number;
  claimed: string[];
}

export interface GearItem {
  id: string;
  slot: 'weapon' | 'armor' | 'accessory';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  name: string;
  power: number;
  /** Item level; drives affix magnitude. Optional for pre-loot-update saves. */
  ilvl?: number;
  /** Rolled modifiers. Absent on legacy items, which is a valid empty state. */
  affixes?: import('./loot').Affix[];
  /** Set membership, if any. */
  setId?: string;
  icon: string;
}

export interface BoosterActive {
  id: string;
  expires: number;
}

// ---- Boss battles ----
export interface BossDef {
  id: string;
  icon: string;
  name: string;
  lvl: number;
  hp: number;
  atk: number;
  xp: number;
  gold: number;
  unlock: string;
}

export interface BossBattleState {
  bossId: string;
  bossHp: number;
  bossMaxHp: number;
  bossAtk: number;
  log: { t: string; c: 'you' | 'boss' | 'crit' }[];
}

// ---- Achievements ----
export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  cond: (s: GameState) => boolean;
}

// ---- Skills ----
export interface SkillDef {
  id: string;
  icon: string;
  name: string;
  max: number;
  de: string;
}

// ---- Weekly Trial ----
export interface WeeklyTrialState {
  startedAt: number;
  bossName: string;
  bossMaxHp: number;
  bossHp: number;
  damageDealt: number;
  defeated: boolean;
}

// ---- Seasons ----
export interface SeasonInfo {
  id: string;
  name: string;
  start: number;
  end: number;
}

// ---- Analytics history ----
export interface DailyRecord {
  date: string;
  xp: number;
  gold: number;
  workouts: number;
  minutes: number;
}

// ---- Habit stacking ----
export interface StackDef {
  id: string;
  icon: string;
  name: string;
  chain: string[]; // activity ids in order
  desc: string;
}

export interface BoosterDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;
  durMin?: number;
  type: 'xp' | 'gold' | 'energy' | 'combo' | 'luck';
}
