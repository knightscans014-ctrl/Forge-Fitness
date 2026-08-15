// Static content: classes, quest pools, missions, boosters, subscription tiers.

import { ClassDef, BoosterDef } from './types';

export const CLASSES: ClassDef[] = [
  { id: 'warrior', icon: '🛡️', name: 'Warrior', color: '#ff8a5c', desc: 'Strength & power. +STR growth, +gold from heavy lifts.', bonus: { str: 3, vig: 1 } },
  { id: 'ranger', icon: '🏹', name: 'Ranger', color: '#4dc3ff', desc: 'Speed & endurance. +VIG growth, +XP from cardio.', bonus: { vig: 3, vit: 1 } },
  { id: 'monk', icon: '🧘', name: 'Monk', color: '#ffd166', desc: 'Mobility & mind. +FLEX & FOCUS, +energy recovery.', bonus: { flx: 2, foc: 2 } },
  { id: 'mage', icon: '🔮', name: 'Mage', color: '#b18cff', desc: 'Discipline & mastery. +FOCUS, +skill points each level.', bonus: { foc: 3, vit: 1 } },
  { id: 'assassin', icon: '🗡️', name: 'Assassin', color: '#ff5d73', desc: 'Crit & burst. +VIG/STR, bonus boss-crit chance.', bonus: { vig: 2, str: 1, foc: 1 } },
  { id: 'paladin', icon: '⚔️', name: 'Paladin', color: '#7cffb2', desc: 'Tank & sustain. +VIT/STR, +max HP, damage resist.', bonus: { vit: 2, str: 1, flx: 1 } },
];

export interface Activity {
  id: string;
  icon: string;
  name: string;
  stat: 'str' | 'vig' | 'vit' | 'flx' | 'foc';
  xpPerMin: number;
  goldPerMin: number;
  drop: number;
}
export const ACTIVITIES: Activity[] = [
  { id: 'strength', icon: '🏋️', name: 'Strength Training', stat: 'str', xpPerMin: 5, goldPerMin: 2.2, drop: 0.05 },
  { id: 'cardio', icon: '🏃', name: 'Cardio / Run', stat: 'vig', xpPerMin: 5.5, goldPerMin: 1.8, drop: 0.05 },
  { id: 'steps', icon: '👟', name: 'Walking / Steps', stat: 'vig', xpPerMin: 2.5, goldPerMin: 1.0, drop: 0.03 },
  { id: 'mobility', icon: '🤸', name: 'Stretch / Yoga', stat: 'flx', xpPerMin: 4, goldPerMin: 1.5, drop: 0.04 },
  { id: 'meditation', icon: '🧘', name: 'Meditation', stat: 'foc', xpPerMin: 4.5, goldPerMin: 1.2, drop: 0.04 },
  { id: 'recovery', icon: '😴', name: 'Sleep / Rest Day', stat: 'vit', xpPerMin: 3, goldPerMin: 1.0, drop: 0.03 },
];

export interface Quest {
  id: string;
  icon: string;
  title: string;
  stat: string;
  type: string;
  min: number;
  desc: string;
  xp: number;
  gold: number;
}
export const DAILY_POOL: Quest[] = [
  { id: 'q_w', icon: '💪', title: 'Strength Call', stat: 'str', type: 'strength', min: 20, desc: 'Lift for 20+ min', xp: 80, gold: 25 },
  { id: 'q_c', icon: '🏃', title: 'Heart Ignition', stat: 'vig', type: 'cardio', min: 20, desc: '20+ min cardio', xp: 80, gold: 25 },
  { id: 'q_s', icon: '👟', title: 'Step Count', stat: 'vig', type: 'steps', min: 8000, desc: 'Reach 8,000 steps', xp: 70, gold: 22 },
  { id: 'q_h', icon: '💧', title: 'Hydration', stat: 'vit', type: 'water', min: 2, desc: 'Log 2L of water', xp: 50, gold: 15 },
  { id: 'q_z', icon: '😴', title: 'Deep Rest', stat: 'vit', type: 'sleep', min: 7, desc: 'Get 7h+ sleep', xp: 60, gold: 18 },
  { id: 'q_m', icon: '🧘', title: 'Clear Mind', stat: 'foc', type: 'meditation', min: 10, desc: 'Meditate 10+ min', xp: 65, gold: 20 },
  { id: 'q_w2', icon: '🏋️', title: 'Power Hour', stat: 'str', type: 'strength', min: 45, desc: '45+ min lifting', xp: 130, gold: 40 },
  { id: 'q_c2', icon: '🚴', title: 'Cardio Storm', stat: 'vig', type: 'cardio', min: 40, desc: '40+ min cardio', xp: 130, gold: 38 },
  { id: 'q_s2', icon: '🦶', title: '10k Steps', stat: 'vig', type: 'steps', min: 10000, desc: 'Hit 10,000 steps', xp: 110, gold: 35 },
  { id: 'q_m2', icon: '🪫', title: 'Double Mind', stat: 'foc', type: 'meditation', min: 20, desc: 'Meditate 20+ min', xp: 110, gold: 32 },
  { id: 'q_f', icon: '🤸', title: 'Mobility Master', stat: 'flx', type: 'mobility', min: 15, desc: '15+ min stretch/yoga', xp: 70, gold: 22 },
  { id: 'q_v', icon: '🥗', title: 'Fuel Day', stat: 'vit', type: 'nutrition', min: 1, desc: 'Log a clean meal', xp: 55, gold: 18 },
  { id: 'q_h2', icon: '🚰', title: 'Hydrate Hard', stat: 'vit', type: 'water', min: 3, desc: 'Log 3L of water', xp: 90, gold: 28 },
  { id: 'q_w3', icon: '🦾', title: 'Push Power', stat: 'str', type: 'strength', min: 10, desc: 'Heavy compound lift session', xp: 100, gold: 30 },
];

export interface WeeklyQuest {
  id: string; icon: string; title: string; desc: string;
  target: number; stat: string; xp: number; gold: number;
}
export const WEEKLY_QUESTS: WeeklyQuest[] = [
  { id: 'wk1', icon: '🎯', title: 'Workout Warrior', desc: 'Log 5 workouts this week', target: 5, stat: 'workouts', xp: 400, gold: 120 },
  { id: 'wk2', icon: '👟', title: 'Step Titan', desc: 'Reach 30,000 steps this week', target: 30000, stat: 'stepsWeekly', xp: 450, gold: 130 },
  { id: 'wk3', icon: '🏋️', title: 'Volume King', desc: '150 total workout minutes', target: 150, stat: 'minWeekly', xp: 500, gold: 150 },
  { id: 'wk4', icon: '💧', title: 'Hydration Week', desc: 'Log 15L water this week', target: 15, stat: 'waterWeekly', xp: 350, gold: 110 },
  { id: 'wk5', icon: '🧘', title: 'Balanced Hunter', desc: 'Train all 5 stats this week', target: 5, stat: 'statsTrained', xp: 550, gold: 160 },
  { id: 'wk6', icon: '🔁', title: 'Quest Machine', desc: 'Complete 15 daily quests this week', target: 15, stat: 'questsWeekly', xp: 600, gold: 180 },
];

export interface StoryMission {
  id: string; icon: string; name: string; color: string;
  steps: { icon: string; name: string; xp: number; gold: number; check: (s: any) => boolean }[];
}
export const STORY_MISSIONS: StoryMission[] = [
  {
    id: 'sm1', icon: '🌅', name: 'The Awakening Arc', color: '#ffd166',
    steps: [
      { icon: '💪', name: 'First Blood', xp: 60, gold: 20, check: s => s.workouts >= 1 },
      { icon: '🌟', name: 'Rising Hunter', xp: 100, gold: 30, check: s => s.level >= 3 },
      { icon: '🐉', name: 'First Slay', xp: 150, gold: 50, check: s => s.bosses.length >= 1 },
      { icon: '👑', name: 'The Awakening', xp: 250, gold: 100, check: s => s.level >= 6 },
    ],
  },
  {
    id: 'sm2', icon: '🔥', name: 'Habit Flame Arc', color: '#ff8a5c',
    steps: [
      { icon: '🔥', name: 'Ignition', xp: 80, gold: 25, check: s => s.streak >= 3 },
      { icon: '⚡', name: 'Unbroken', xp: 150, gold: 50, check: s => s.streak >= 7 },
      { icon: '🌋', name: 'Blazing', xp: 300, gold: 100, check: s => s.streak >= 14 },
    ],
  },
  {
    id: 'sm3', icon: '⚡', name: 'Volume Arc', color: '#4dc3ff',
    steps: [
      { icon: '🏋️', name: 'Novice', xp: 80, gold: 25, check: s => s.workouts >= 5 },
      { icon: '💪', name: 'Consistent', xp: 200, gold: 70, check: s => s.workouts >= 20 },
      { icon: '🦾', name: 'Machine', xp: 500, gold: 180, check: s => s.workouts >= 50 },
    ],
  },
];

export interface TieredMission {
  id: string; icon: string; name: string; unit: string;
  tiers: { lvl: string; v: number }[];
  xp: number[]; gold: number[];
}
export const TIERED_MISSIONS: TieredMission[] = [
  { id: 'tm1', icon: '🏃', name: 'Cardio', unit: 'min', tiers: [{ lvl: 'Easy', v: 30 }, { lvl: 'Normal', v: 60 }, { lvl: 'Hard', v: 120 }], xp: [60, 120, 220], gold: [20, 45, 90] },
  { id: 'tm2', icon: '👟', name: 'Steps', unit: 'steps', tiers: [{ lvl: 'Easy', v: 5000 }, { lvl: 'Normal', v: 10000 }, { lvl: 'Hard', v: 20000 }], xp: [50, 100, 200], gold: [18, 40, 80] },
  { id: 'tm3', icon: '💧', name: 'Hydration', unit: 'L', tiers: [{ lvl: 'Easy', v: 1 }, { lvl: 'Normal', v: 2 }, { lvl: 'Hard', v: 4 }], xp: [40, 80, 160], gold: [15, 30, 65] },
];

export interface DailyChallenge {
  id: string; icon: string; name: string; desc: string; xp: number; gold: number;
  check: (s: any) => boolean;
}
export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'c1', icon: '🃏', name: '5x5 Day', desc: 'Log 5 workouts', xp: 200, gold: 80, check: s => s.workoutsToday >= 5 },
  { id: 'c2', icon: '🚰', name: 'Hydration Hero', desc: 'Log 3L water', xp: 150, gold: 60, check: s => s.waterToday >= 3 },
  { id: 'c3', icon: '⚡', name: 'Step Storm', desc: 'Hit 12,000 steps', xp: 180, gold: 70, check: s => s.stepsToday >= 12000 },
  { id: 'c4', icon: '🏋️', name: 'Heavy Lifts', desc: '45+ min strength', xp: 190, gold: 75, check: s => s.strengthMinToday >= 45 },
  { id: 'c5', icon: '🧠', name: 'Clear Head', desc: 'Meditate 20 min', xp: 160, gold: 65, check: s => s.meditationMinToday >= 20 },
  { id: 'c6', icon: '⚖️', name: 'Balanced', desc: 'Train 3 different stats', xp: 200, gold: 80, check: s => Object.keys(s.statsTrainedToday || {}).length >= 3 },
];

export interface MilestoneMission {
  id: string; icon: string; name: string; desc: string;
  target: number; stat: string; xp: number; gold: number;
}
export const MILESTONE_MISSIONS: MilestoneMission[] = [
  { id: 'mm1', icon: '🏆', name: 'Centurion', desc: 'Log 100 workouts', target: 100, stat: 'workouts', xp: 1000, gold: 400 },
  { id: 'mm2', icon: '🔥', name: 'Unstoppable', desc: '30-day streak', target: 30, stat: 'streak', xp: 1500, gold: 500 },
  { id: 'mm3', icon: '👑', name: 'S-Rank', desc: 'Reach S-Rank', target: 30, stat: 'level', xp: 2000, gold: 700 },
  { id: 'mm4', icon: '🐉', name: 'Boss Slayer', desc: 'Defeat 5 bosses', target: 5, stat: 'bossCount', xp: 1200, gold: 450 },
];

export const BOOSTERS: BoosterDef[] = [
  { id: 'b_xp', icon: '🚀', name: 'XP Rush', desc: '2× XP for 30 min', cost: 150, durMin: 30, type: 'xp' },
  { id: 'b_gold', icon: '💰', name: 'Gold Fever', desc: '2× gold for 30 min', cost: 140, durMin: 30, type: 'gold' },
  { id: 'b_elixir', icon: '⚗️', name: 'Energy Elixir', desc: 'Instantly refill all energy', cost: 120, type: 'energy' },
  { id: 'b_combo', icon: '🔗', name: 'Combo Master', desc: '2× combo points for 30 min', cost: 180, durMin: 30, type: 'combo' },
];

export const DAILY_REWARDS = [
  { gold: 30 },
  { gold: 40 },
  { gold: 50, xp: 30 },
  { gold: 60 },
  { gold: 75, xp: 40 },
  { gold: 100, energy: 20 },
  { gold: 150, xp: 100 },
];

export interface Tier { id: string; name: string; per: string; price: string; tag: string; value: number; perks: string[]; }
export const PREMIUM_TIERS: Tier[] = [
  { id: 't1', name: 'Ranger', per: '/year', price: '₹99', tag: '', value: 1, perks: ['+10% XP boost', '+15% gold boost', 'Extra daily quest slot', 'Ad-free experience'] },
  { id: 't2', name: 'Elite', per: '/year', price: '₹199', tag: 'MOST POPULAR', value: 2, perks: ['Everything in Ranger', '+25% XP boost', 'Weekly loot crate', 'Unlock all stat presets', 'Priority support'] },
  { id: 't3', name: 'Monarch', per: '/year', price: '₹299', tag: 'BEST VALUE', value: 3, perks: ['Everything in Elite', '+40% XP boost', 'Exclusive Monarch avatar + aura', 'Early boss raids', 'Advanced progress analytics', 'Founder badge'] },
];
