// Static content: classes, quest pools, missions, boosters, difficulty paths.

import { ClassDef, BoosterDef, GameState, StatId } from './types';

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
  stat: StatId;
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

/**
 * Quest difficulty band. The daily slate is assembled from all three so a day
 * always has something quick, something real, and something that hurts.
 */
export type QuestTier = 'light' | 'core' | 'elite';

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
  tier: QuestTier;
}

/**
 * The daily quest pool.
 *
 * Every id here is permanent: a save records completed quests by id, so
 * renaming or reusing an id would silently mark the wrong quest done. Add new
 * quests to the end of a section rather than renumbering.
 */
export const DAILY_POOL: Quest[] = [
  // ---- original fourteen (ids frozen) ----
  { id: 'q_w', icon: '💪', title: 'Strength Call', stat: 'str', type: 'strength', min: 20, desc: 'Lift for 20+ min', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_c', icon: '🏃', title: 'Heart Ignition', stat: 'vig', type: 'cardio', min: 20, desc: '20+ min cardio', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_s', icon: '👟', title: 'Step Count', stat: 'vig', type: 'steps', min: 8000, desc: 'Reach 8,000 steps', xp: 70, gold: 22, tier: 'core' },
  { id: 'q_h', icon: '💧', title: 'Hydration', stat: 'vit', type: 'water', min: 2, desc: 'Log 2L of water', xp: 50, gold: 15, tier: 'light' },
  { id: 'q_z', icon: '😴', title: 'Deep Rest', stat: 'vit', type: 'sleep', min: 7, desc: 'Get 7h+ sleep', xp: 60, gold: 18, tier: 'light' },
  { id: 'q_m', icon: '🧘', title: 'Clear Mind', stat: 'foc', type: 'meditation', min: 10, desc: 'Meditate 10+ min', xp: 65, gold: 20, tier: 'light' },
  { id: 'q_w2', icon: '🏋️', title: 'Power Hour', stat: 'str', type: 'strength', min: 45, desc: '45+ min lifting', xp: 130, gold: 40, tier: 'elite' },
  { id: 'q_c2', icon: '🚴', title: 'Cardio Storm', stat: 'vig', type: 'cardio', min: 40, desc: '40+ min cardio', xp: 130, gold: 38, tier: 'elite' },
  { id: 'q_s2', icon: '🦶', title: '10k Steps', stat: 'vig', type: 'steps', min: 10000, desc: 'Hit 10,000 steps', xp: 110, gold: 35, tier: 'core' },
  { id: 'q_m2', icon: '🪫', title: 'Double Mind', stat: 'foc', type: 'meditation', min: 20, desc: 'Meditate 20+ min', xp: 110, gold: 32, tier: 'core' },
  { id: 'q_f', icon: '🤸', title: 'Mobility Master', stat: 'flx', type: 'mobility', min: 15, desc: '15+ min stretch/yoga', xp: 70, gold: 22, tier: 'core' },
  { id: 'q_v', icon: '🥗', title: 'Fuel Day', stat: 'vit', type: 'nutrition', min: 1, desc: 'Log a clean meal', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_h2', icon: '🚰', title: 'Hydrate Hard', stat: 'vit', type: 'water', min: 3, desc: 'Log 3L of water', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_w3', icon: '🦾', title: 'Push Power', stat: 'str', type: 'strength', min: 10, desc: 'Squat, deadlift or bench — heavy, 20+ min', xp: 100, gold: 30, tier: 'core' },

  // ---- strength ----
  { id: 'q_st01', icon: '🔩', title: 'Iron Warmup', stat: 'str', type: 'strength', min: 10, desc: '10 min of lifting, nothing heroic', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_st02', icon: '🫸', title: 'Push Day', stat: 'str', type: 'strength', min: 30, desc: 'Bench, overhead press, dips — 20+ min', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_st03', icon: '🫷', title: 'Pull Day', stat: 'str', type: 'strength', min: 30, desc: 'Rows, pull-ups, curls — 20+ min', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_st04', icon: '🦵', title: 'Leg Day', stat: 'str', type: 'strength', min: 35, desc: 'Squats, lunges, leg press — 20+ min', xp: 105, gold: 33, tier: 'core' },
  { id: 'q_st05', icon: '🅿️', title: 'Century Pushups', stat: 'str', type: 'strength', min: 100, desc: '100 pushups across the day', xp: 140, gold: 45, tier: 'elite' },
  { id: 'q_st06', icon: '🪑', title: 'Fifty Squats', stat: 'str', type: 'strength', min: 50, desc: '50 bodyweight squats', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_st07', icon: '🧗', title: 'Dead Hang', stat: 'str', type: 'strength', min: 1, desc: 'Hang from a bar for 60 seconds total', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_st08', icon: '🧱', title: 'Plank Protocol', stat: 'str', type: 'strength', min: 3, desc: 'Hold a plank for 3 minutes total', xp: 60, gold: 20, tier: 'light' },
  { id: 'q_st09', icon: '🪝', title: 'Pull-Up Set', stat: 'str', type: 'strength', min: 25, desc: '25 pull-ups or rows', xp: 100, gold: 32, tier: 'core' },
  { id: 'q_st10', icon: '⚰️', title: 'Deadlift Trial', stat: 'str', type: 'strength', min: 1, desc: 'Deadlifts — work up to a heavy set, 20+ min', xp: 160, gold: 50, tier: 'elite' },
  { id: 'q_st11', icon: '🛏️', title: 'Bench Trial', stat: 'str', type: 'strength', min: 1, desc: 'Bench press — work up to a heavy set, 20+ min', xp: 150, gold: 48, tier: 'elite' },
  { id: 'q_st12', icon: '🤏', title: 'Grip Forge', stat: 'str', type: 'strength', min: 5, desc: 'Farmer carries or dead hangs — 10+ min', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_st13', icon: '🎯', title: 'Core Circuit', stat: 'str', type: 'strength', min: 10, desc: '10 minutes of dedicated core work', xp: 80, gold: 26, tier: 'core' },
  { id: 'q_st14', icon: '📈', title: 'Progressive Overload', stat: 'str', type: 'strength', min: 1, desc: 'Beat a past lift by 1 rep or 2.5kg', xp: 175, gold: 55, tier: 'elite' },
  { id: 'q_st15', icon: '🔔', title: 'Kettlebell Storm', stat: 'str', type: 'strength', min: 15, desc: '15 min of kettlebell work', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_st16', icon: '💥', title: 'Burpee Gauntlet', stat: 'str', type: 'strength', min: 75, desc: '75 burpees, however long it takes', xp: 155, gold: 48, tier: 'elite' },
  { id: 'q_st17', icon: '🤸', title: 'Calisthenics Flow', stat: 'str', type: 'strength', min: 20, desc: 'Bodyweight circuit for 20 min', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_st18', icon: '🧰', title: 'Accessory Work', stat: 'str', type: 'strength', min: 12, desc: 'Calves, rear delts, forearms — 10+ min', xp: 75, gold: 24, tier: 'light' },

  // ---- cardio ----
  { id: 'q_cd01', icon: '🚶', title: 'Easy Miles', stat: 'vig', type: 'cardio', min: 10, desc: '10+ min of easy cardio', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_cd02', icon: '⏱️', title: 'Tempo Run', stat: 'vig', type: 'cardio', min: 25, desc: '25 min at a pace you can barely hold', xp: 100, gold: 32, tier: 'core' },
  { id: 'q_cd03', icon: '⚡', title: 'Interval Assault', stat: 'vig', type: 'cardio', min: 8, desc: '8 rounds of hard intervals', xp: 165, gold: 52, tier: 'elite' },
  { id: 'q_cd04', icon: '⛰️', title: 'Hill Climb', stat: 'vig', type: 'cardio', min: 20, desc: 'Run or walk a hilly route — 20+ min', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_cd05', icon: '🛣️', title: 'The Long Run', stat: 'vig', type: 'cardio', min: 60, desc: '60+ min of continuous cardio', xp: 190, gold: 60, tier: 'elite' },
  { id: 'q_cd06', icon: '🏁', title: 'Sprint Set', stat: 'vig', type: 'cardio', min: 10, desc: '10 all-out sprints', xp: 105, gold: 33, tier: 'core' },
  { id: 'q_cd07', icon: '🚲', title: 'Cycle Circuit', stat: 'vig', type: 'cardio', min: 30, desc: '30 min on the bike', xp: 100, gold: 31, tier: 'core' },
  { id: 'q_cd08', icon: '🏊', title: 'Swim Set', stat: 'vig', type: 'cardio', min: 20, desc: '20 min in the pool', xp: 105, gold: 33, tier: 'core' },
  { id: 'q_cd09', icon: '🪢', title: 'Jump Rope', stat: 'vig', type: 'cardio', min: 5, desc: '5 min of skipping', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_cd10', icon: '🪜', title: 'Stair Ascent', stat: 'vig', type: 'cardio', min: 20, desc: 'Climb 20 flights of stairs', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_cd11', icon: '🫀', title: 'Zone Two Hold', stat: 'vig', type: 'cardio', min: 45, desc: '45 min in an easy aerobic zone', xp: 145, gold: 45, tier: 'elite' },
  { id: 'q_cd12', icon: '🚣', title: 'Row Trial', stat: 'vig', type: 'cardio', min: 2000, desc: '2,000m on the rower', xp: 110, gold: 34, tier: 'core' },
  { id: 'q_cd13', icon: '🥊', title: 'Shadow Boxing', stat: 'vig', type: 'cardio', min: 8, desc: '8 min of shadow boxing', xp: 60, gold: 20, tier: 'light' },
  { id: 'q_cd14', icon: '🔥', title: 'HIIT Burst', stat: 'vig', type: 'cardio', min: 20, desc: '20 min of high-intensity intervals', xp: 150, gold: 47, tier: 'elite' },
  { id: 'q_cd15', icon: '🌄', title: 'Sunrise Cardio', stat: 'vig', type: 'cardio', min: 15, desc: '15+ min cardio before 9am', xp: 85, gold: 27, tier: 'core' },

  // ---- steps ----
  { id: 'q_sp01', icon: '🌅', title: 'Morning Walk', stat: 'vig', type: 'steps', min: 3000, desc: '3,000 steps before noon', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_sp02', icon: '5️⃣', title: 'Five Thousand', stat: 'vig', type: 'steps', min: 5000, desc: 'Reach 5,000 steps', xp: 60, gold: 19, tier: 'light' },
  { id: 'q_sp03', icon: '🍽️', title: 'Lunch Loop', stat: 'vig', type: 'steps', min: 1000, desc: 'Walk after a meal', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_sp04', icon: '🔢', title: 'Twelve Thousand', stat: 'vig', type: 'steps', min: 12000, desc: 'Reach 12,000 steps', xp: 140, gold: 44, tier: 'elite' },
  { id: 'q_sp05', icon: '🏔️', title: 'Fifteen Thousand', stat: 'vig', type: 'steps', min: 15000, desc: 'Reach 15,000 steps', xp: 180, gold: 56, tier: 'elite' },
  { id: 'q_sp06', icon: '🚫', title: 'No Lifts Today', stat: 'vig', type: 'steps', min: 1, desc: 'Stairs only — no lifts or escalators all day', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_sp07', icon: '🌙', title: 'Evening Stroll', stat: 'vig', type: 'steps', min: 20, desc: 'Walk 20 minutes after sunset', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_sp08', icon: '🎒', title: 'Commute on Foot', stat: 'vig', type: 'steps', min: 1, desc: 'Walk part of your commute', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_sp09', icon: '🎧', title: 'Podcast Walk', stat: 'vig', type: 'steps', min: 30, desc: 'One episode, one walk', xp: 70, gold: 22, tier: 'light' },

  // ---- hydration ----
  { id: 'q_wt01', icon: '🥛', title: 'First Glass', stat: 'vit', type: 'water', min: 1, desc: 'Drink water within 30 min of waking', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_wt02', icon: '🌊', title: 'Four Litres', stat: 'vit', type: 'water', min: 4, desc: 'Log 4L of water', xp: 130, gold: 40, tier: 'elite' },
  { id: 'q_wt03', icon: '⏳', title: 'Steady Sips', stat: 'vit', type: 'water', min: 1, desc: 'Drink water every hour you are awake', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_wt04', icon: '🧊', title: 'Swap the Sugar', stat: 'vit', type: 'water', min: 1, desc: 'Replace one sugary drink with water', xp: 55, gold: 18, tier: 'light' },

  // ---- nutrition ----
  { id: 'q_nu01', icon: '🍗', title: 'Protein Target', stat: 'vit', type: 'nutrition', min: 1, desc: 'Hit your protein target for the day', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_nu02', icon: '🥦', title: 'Greens Twice', stat: 'vit', type: 'nutrition', min: 2, desc: 'Vegetables at two separate meals', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_nu03', icon: '🚭', title: 'No Added Sugar', stat: 'vit', type: 'nutrition', min: 1, desc: 'A full day with no added sugar', xp: 145, gold: 45, tier: 'elite' },
  { id: 'q_nu04', icon: '🍳', title: 'Cook It Yourself', stat: 'vit', type: 'nutrition', min: 1, desc: 'Cook one meal from scratch', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_nu05', icon: '🥣', title: 'Real Breakfast', stat: 'vit', type: 'nutrition', min: 1, desc: 'Eat a real breakfast with protein', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_nu06', icon: '🌃', title: 'Kitchen Closed', stat: 'vit', type: 'nutrition', min: 1, desc: 'Nothing after 9pm', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_nu07', icon: '🍎', title: 'Whole Foods Day', stat: 'vit', type: 'nutrition', min: 1, desc: 'Nothing from a packet all day', xp: 150, gold: 47, tier: 'elite' },

  // ---- sleep & recovery ----
  { id: 'q_sl01', icon: '🕚', title: 'Early Lights', stat: 'vit', type: 'sleep', min: 1, desc: 'In bed before 11pm', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_sl02', icon: '🛌', title: 'Eight Hours', stat: 'vit', type: 'sleep', min: 8, desc: 'Get 8h+ of sleep', xp: 140, gold: 44, tier: 'elite' },
  { id: 'q_sl03', icon: '📵', title: 'No Screens', stat: 'vit', type: 'sleep', min: 30, desc: 'No screens for 30 min before bed', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_sl04', icon: '🏖️', title: 'Rest Day Honoured', stat: 'vit', type: 'sleep', min: 1, desc: 'Full rest day — no training, on purpose', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_sl05', icon: '💤', title: 'Power Nap', stat: 'vit', type: 'sleep', min: 20, desc: 'A 20 minute nap', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_rc01', icon: '🚿', title: 'Cold Finish', stat: 'vit', type: 'recovery', min: 1, desc: 'Finish your shower with 60s cold', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_rc02', icon: '🧻', title: 'Foam Roll', stat: 'vit', type: 'recovery', min: 10, desc: '10 min on the foam roller', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_rc03', icon: '☀️', title: 'Daylight', stat: 'vit', type: 'recovery', min: 15, desc: '15 min of real daylight', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_rc04', icon: '🩹', title: 'Tend the Weak Link', stat: 'vit', type: 'recovery', min: 10, desc: '10+ min rehab on a nagging joint or muscle', xp: 95, gold: 30, tier: 'core' },

  // ---- mobility ----
  { id: 'q_mb01', icon: '🌤️', title: 'Wake-Up Stretch', stat: 'flx', type: 'mobility', min: 5, desc: '5 min of morning stretching', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_mb02', icon: '🧎', title: 'Yoga Flow', stat: 'flx', type: 'mobility', min: 25, desc: '25 min of yoga', xp: 100, gold: 32, tier: 'core' },
  { id: 'q_mb03', icon: '🦿', title: 'Hip Openers', stat: 'flx', type: 'mobility', min: 10, desc: '10 min of hip mobility', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_mb04', icon: '💁', title: 'Shoulder Care', stat: 'flx', type: 'mobility', min: 8, desc: 'Run the shoulder mobility routine', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_mb05', icon: '🕸️', title: 'Deep Stretch', stat: 'flx', type: 'mobility', min: 30, desc: '30 min of deep stretching', xp: 135, gold: 42, tier: 'elite' },
  { id: 'q_mb06', icon: '🪟', title: 'Desk Breaks', stat: 'flx', type: 'mobility', min: 1, desc: 'Stand and stretch every hour', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_mb07', icon: '🦴', title: 'Joint Prep', stat: 'flx', type: 'mobility', min: 6, desc: 'Ankle and wrist circles — 5+ min', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_mb08', icon: '🩰', title: 'Splits Progress', stat: 'flx', type: 'mobility', min: 20, desc: '20 min working toward the splits', xp: 140, gold: 44, tier: 'elite' },
  { id: 'q_mb09', icon: '🐈', title: 'Spine Flow', stat: 'flx', type: 'mobility', min: 8, desc: 'Cat-cow and thoracic rotations — 5+ min', xp: 80, gold: 26, tier: 'core' },
  { id: 'q_mb10', icon: '🧗', title: 'Full Range', stat: 'flx', type: 'mobility', min: 1, desc: 'Take every lift through its full range', xp: 110, gold: 34, tier: 'core' },

  // ---- focus & mind ----
  { id: 'q_md01', icon: '🫧', title: 'Two Minutes', stat: 'foc', type: 'meditation', min: 2, desc: 'Meditate for two minutes. That is all', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_md02', icon: '🌬️', title: 'Breath Ladder', stat: 'foc', type: 'meditation', min: 1, desc: 'Box breathing — 20 slow counted breaths', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_md03', icon: '🗿', title: 'Half Hour Still', stat: 'foc', type: 'meditation', min: 30, desc: 'Meditate for 30 minutes', xp: 160, gold: 50, tier: 'elite' },
  { id: 'q_md04', icon: '📴', title: 'Digital Fast', stat: 'foc', type: 'focus', min: 120, desc: 'Two hours with no phone', xp: 150, gold: 47, tier: 'elite' },
  { id: 'q_md05', icon: '📓', title: 'Journal Entry', stat: 'foc', type: 'focus', min: 1, desc: 'Write down how training actually went', xp: 85, gold: 27, tier: 'core' },
  { id: 'q_md06', icon: '🗓️', title: 'Plan Tomorrow', stat: 'foc', type: 'focus', min: 1, desc: 'Write tomorrow plan before you sleep', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_md07', icon: '🙏', title: 'Three Wins', stat: 'foc', type: 'focus', min: 3, desc: 'Note three things that went right', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_md08', icon: '🎛️', title: 'Single Task', stat: 'foc', type: 'focus', min: 60, desc: 'One hour, one task, no tabs', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_md09', icon: '🧠', title: 'Visualise', stat: 'foc', type: 'focus', min: 5, desc: 'Five minutes rehearsing the session', xp: 80, gold: 26, tier: 'core' },
  { id: 'q_md10', icon: '🤫', title: 'Silence Walk', stat: 'foc', type: 'focus', min: 15, desc: 'Walk 15 min with nothing in your ears', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_md11', icon: '📖', title: 'Ten Pages', stat: 'foc', type: 'focus', min: 10, desc: 'Read ten pages of anything', xp: 55, gold: 18, tier: 'light' },
  { id: 'q_md12', icon: '🧿', title: 'Body Scan', stat: 'foc', type: 'meditation', min: 12, desc: 'A 12 minute body scan', xp: 90, gold: 28, tier: 'core' },

  // ---- mixed discipline ----
  { id: 'q_mx01', icon: '♻️', title: 'Double Session', stat: 'vig', type: 'mixed', min: 2, desc: 'Two separate sessions in one day', xp: 185, gold: 58, tier: 'elite' },
  { id: 'q_mx02', icon: '🧩', title: 'Full Body Sweep', stat: 'foc', type: 'mixed', min: 3, desc: 'Train three different stats today', xp: 170, gold: 53, tier: 'elite' },
  { id: 'q_mx03', icon: '📝', title: 'Log Everything', stat: 'foc', type: 'mixed', min: 1, desc: 'Log every activity, even the bad ones', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_mx04', icon: '😤', title: 'Zero Excuses', stat: 'str', type: 'mixed', min: 1, desc: 'Train anyway — 20+ min on a low-motivation day', xp: 110, gold: 34, tier: 'core' },
  { id: 'q_mx05', icon: '🔄', title: 'Bookends', stat: 'flx', type: 'mixed', min: 1, desc: 'Warm up and cool down properly', xp: 80, gold: 25, tier: 'core' },
  { id: 'q_mx06', icon: '🌳', title: 'Train Outdoors', stat: 'vig', type: 'mixed', min: 1, desc: 'Train outdoors — 20+ min', xp: 90, gold: 28, tier: 'core' },
  { id: 'q_mx07', icon: '🤝', title: 'Bring Someone', stat: 'vit', type: 'mixed', min: 1, desc: 'Train with a friend — 20+ min', xp: 95, gold: 30, tier: 'core' },
  { id: 'q_mx08', icon: '⏭️', title: 'Beat Yesterday', stat: 'vig', type: 'mixed', min: 1, desc: 'Exceed yesterday total minutes', xp: 150, gold: 47, tier: 'elite' },
  { id: 'q_mx09', icon: '🌞', title: 'Dawn Session', stat: 'str', type: 'mixed', min: 1, desc: 'Finish training before 9am', xp: 100, gold: 31, tier: 'core' },
  { id: 'q_mx10', icon: '⚖️', title: 'Weigh In', stat: 'vit', type: 'mixed', min: 1, desc: 'Record your weight without flinching', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_mx11', icon: '👕', title: 'Kit Ready', stat: 'foc', type: 'mixed', min: 1, desc: 'Lay out tomorrow training kit', xp: 45, gold: 15, tier: 'light' },
  { id: 'q_mx12', icon: '🔟', title: 'Ten Minute Rule', stat: 'str', type: 'mixed', min: 10, desc: 'Start a session even if only for 10 min', xp: 50, gold: 16, tier: 'light' },
  { id: 'q_mx13', icon: '🥇', title: 'Perfect Day', stat: 'vit', type: 'mixed', min: 1, desc: 'Train, hydrate, sleep well. All three', xp: 200, gold: 62, tier: 'elite' },
  { id: 'q_mx14', icon: '🧭', title: 'New Ground', stat: 'vig', type: 'mixed', min: 1, desc: 'Try one movement you have never done before', xp: 120, gold: 38, tier: 'core' },
];

export interface WeeklyQuest {
  id: string; icon: string; title: string; desc: string;
  target: number; stat: 'workouts' | 'stepsWeekly' | 'minWeekly' | 'waterWeekly' | 'statsTrained' | 'questsWeekly'; xp: number; gold: number;
}
export const WEEKLY_QUESTS: WeeklyQuest[] = [
  { id: 'wk1', icon: '🎯', title: 'Workout Warrior', desc: 'Log 5 workouts this week', target: 5, stat: 'workouts', xp: 400, gold: 120 },
  { id: 'wk2', icon: '👟', title: 'Step Titan', desc: 'Reach 30,000 steps this week', target: 30000, stat: 'stepsWeekly', xp: 450, gold: 130 },
  { id: 'wk3', icon: '🏋️', title: 'Volume King', desc: '150 total workout minutes', target: 150, stat: 'minWeekly', xp: 500, gold: 150 },
  { id: 'wk4', icon: '💧', title: 'Hydration Week', desc: 'Log 15L water this week', target: 15, stat: 'waterWeekly', xp: 350, gold: 110 },
  { id: 'wk5', icon: '🧘', title: 'Balanced Hunter', desc: 'Train all 5 stats this week', target: 5, stat: 'statsTrained', xp: 550, gold: 160 },
  { id: 'wk6', icon: '🔁', title: 'Quest Machine', desc: 'Complete 15 daily quests this week', target: 15, stat: 'questsWeekly', xp: 600, gold: 180 },
  // opening rungs, so a new hunter clears something in week one
  { id: 'wk7', icon: '🌱', title: 'First Three', desc: 'Log 3 workouts this week', target: 3, stat: 'workouts', xp: 200, gold: 70 },
  { id: 'wk8', icon: '⏱️', title: 'Warm-Up Week', desc: '60 total workout minutes', target: 60, stat: 'minWeekly', xp: 200, gold: 70 },
  { id: 'wk9', icon: '🚶', title: 'Steady Steps', desc: 'Reach 15,000 steps this week', target: 15000, stat: 'stepsWeekly', xp: 220, gold: 75 },
  { id: 'wk10', icon: '🥛', title: 'Water Start', desc: 'Log 7L water this week', target: 7, stat: 'waterWeekly', xp: 180, gold: 60 },
  { id: 'wk11', icon: '🗂️', title: 'Quest Starter', desc: 'Complete 5 daily quests this week', target: 5, stat: 'questsWeekly', xp: 180, gold: 60 },
  // the deep end
  { id: 'wk12', icon: '⚙️', title: 'Iron Week', desc: 'Log 8 workouts this week', target: 8, stat: 'workouts', xp: 700, gold: 210 },
  { id: 'wk13', icon: '📅', title: 'Perfect Week', desc: 'Log 7 workouts this week', target: 7, stat: 'workouts', xp: 800, gold: 250 },
  { id: 'wk14', icon: '🏔️', title: 'Step Legend', desc: 'Reach 70,000 steps this week', target: 70000, stat: 'stepsWeekly', xp: 900, gold: 280 },
  { id: 'wk15', icon: '🌋', title: 'Marathon Minutes', desc: '300 total workout minutes', target: 300, stat: 'minWeekly', xp: 950, gold: 300 },
  { id: 'wk16', icon: '🌊', title: 'Hydration Flood', desc: 'Log 25L water this week', target: 25, stat: 'waterWeekly', xp: 600, gold: 190 },
  { id: 'wk17', icon: '👑', title: 'Quest Hunter', desc: 'Complete 30 daily quests this week', target: 30, stat: 'questsWeekly', xp: 1000, gold: 320 },
];

export interface StoryMissionStep {
  icon: string;
  /** Flavour name, e.g. 'First Blood'. */
  name: string;
  /**
   * Plain-language requirement, e.g. 'Log 1 workout'. Always shown next to
   * `name` so the player can tell what the step actually asks for.
   */
  req: string;
  xp: number;
  gold: number;
  check: (s: GameState) => boolean;
}

export interface StoryMission {
  id: string; icon: string; name: string; color: string;
  steps: StoryMissionStep[];
}
export const STORY_MISSIONS: StoryMission[] = [
  {
    id: 'sm1', icon: '🌅', name: 'The Awakening Arc', color: '#ffd166',
    steps: [
      { icon: '💪', name: 'First Blood', req: 'Log 1 workout', xp: 60, gold: 20, check: s => s.workouts >= 1 },
      { icon: '🌟', name: 'Rising Hunter', req: 'Reach level 3', xp: 100, gold: 30, check: s => s.level >= 3 },
      { icon: '🐉', name: 'First Slay', req: 'Defeat 1 boss', xp: 150, gold: 50, check: s => s.bosses.length >= 1 },
      { icon: '👑', name: 'The Awakening', req: 'Reach level 6', xp: 250, gold: 100, check: s => s.level >= 6 },
    ],
  },
  {
    id: 'sm2', icon: '🔥', name: 'Habit Flame Arc', color: '#ff8a5c',
    steps: [
      { icon: '🔥', name: 'Ignition', req: 'Hold a 3-day streak', xp: 80, gold: 25, check: s => s.streak >= 3 },
      { icon: '⚡', name: 'Unbroken', req: 'Hold a 7-day streak', xp: 150, gold: 50, check: s => s.streak >= 7 },
      { icon: '🌋', name: 'Blazing', req: 'Hold a 14-day streak', xp: 300, gold: 100, check: s => s.streak >= 14 },
      { icon: '☄️', name: 'Inextinguishable', req: 'Reach a 30-day best streak', xp: 700, gold: 240, check: s => s.bestStreak >= 30 },
    ],
  },
  {
    id: 'sm3', icon: '⚡', name: 'Volume Arc', color: '#4dc3ff',
    steps: [
      { icon: '🏋️', name: 'Novice', req: 'Log 5 workouts', xp: 80, gold: 25, check: s => s.workouts >= 5 },
      { icon: '💪', name: 'Consistent', req: 'Log 20 workouts', xp: 200, gold: 70, check: s => s.workouts >= 20 },
      { icon: '🦾', name: 'Machine', req: 'Log 50 workouts', xp: 500, gold: 180, check: s => s.workouts >= 50 },
      { icon: '🗿', name: 'Monument', req: 'Log 150 workouts', xp: 1200, gold: 420, check: s => s.workouts >= 150 },
    ],
  },
  {
    id: 'sm4', icon: '⛓️', name: 'The Iron Path', color: '#ff8a5c',
    steps: [
      { icon: '🔩', name: 'Pick Up the Bar', req: 'Reach 10 Strength', xp: 70, gold: 22, check: s => s.stats.str >= 10 },
      { icon: '🛠️', name: 'Forged', req: 'Reach 25 Strength', xp: 180, gold: 60, check: s => s.stats.str >= 25 },
      { icon: '⚒️', name: 'Tempered', req: 'Reach 50 Strength', xp: 420, gold: 150, check: s => s.stats.str >= 50 },
      { icon: '🗡️', name: 'Living Weapon', req: 'Reach 100 Strength', xp: 900, gold: 320, check: s => s.stats.str >= 100 },
    ],
  },
  {
    id: 'sm5', icon: '🛣️', name: 'The Long Road', color: '#4dc3ff',
    steps: [
      { icon: '👟', name: 'First Mile', req: 'Reach 10 Vigour', xp: 70, gold: 22, check: s => s.stats.vig >= 10 },
      { icon: '🏃', name: 'Wind at Your Back', req: 'Reach 25 Vigour', xp: 180, gold: 60, check: s => s.stats.vig >= 25 },
      { icon: '🌬️', name: 'Endless Lungs', req: 'Reach 50 Vigour', xp: 420, gold: 150, check: s => s.stats.vig >= 50 },
      { icon: '🦅', name: 'Untiring', req: 'Reach 100 Vigour', xp: 900, gold: 320, check: s => s.stats.vig >= 100 },
    ],
  },
  {
    id: 'sm6', icon: '🕯️', name: 'Stillness Arc', color: '#b18cff',
    steps: [
      { icon: '🫧', name: 'Sit Down', req: 'Reach 10 Focus', xp: 70, gold: 22, check: s => s.stats.foc >= 10 },
      { icon: '🧘', name: 'Quiet Mind', req: 'Reach 25 Focus', xp: 180, gold: 60, check: s => s.stats.foc >= 25 },
      { icon: '🌌', name: 'Unshakeable', req: 'Reach 50 Focus', xp: 420, gold: 150, check: s => s.stats.foc >= 50 },
      { icon: '🔮', name: 'Clear as Glass', req: 'Reach 100 Focus', xp: 900, gold: 320, check: s => s.stats.foc >= 100 },
    ],
  },
  {
    id: 'sm7', icon: '🌿', name: 'The Supple Arc', color: '#7cffb2',
    steps: [
      { icon: '🤸', name: 'Loosen Up', req: 'Reach 10 Flexibility', xp: 70, gold: 22, check: s => s.stats.flx >= 10 },
      { icon: '🧎', name: 'Range Restored', req: 'Reach 25 Flexibility', xp: 180, gold: 60, check: s => s.stats.flx >= 25 },
      { icon: '🩰', name: 'Water Body', req: 'Reach 50 Flexibility', xp: 420, gold: 150, check: s => s.stats.flx >= 50 },
      { icon: '🌊', name: 'Unbreakable Bend', req: 'Reach 100 Flexibility', xp: 900, gold: 320, check: s => s.stats.flx >= 100 },
    ],
  },
  {
    id: 'sm8', icon: '❤️‍🔥', name: 'Vitality Arc', color: '#ff5d73',
    steps: [
      { icon: '💧', name: 'Drink Up', req: 'Log 10L of water total', xp: 70, gold: 22, check: s => s.totalWater >= 10 },
      { icon: '🥗', name: 'Fuelled', req: 'Reach 25 Vitality', xp: 180, gold: 60, check: s => s.stats.vit >= 25 },
      { icon: '🛌', name: 'Recovered', req: 'Reach 50 Vitality', xp: 420, gold: 150, check: s => s.stats.vit >= 50 },
      { icon: '🫀', name: 'Fortified', req: 'Reach 100 Vitality', xp: 900, gold: 320, check: s => s.stats.vit >= 100 },
    ],
  },
  {
    id: 'sm9', icon: '🗝️', name: 'Ascension Arc', color: '#ffd166',
    steps: [
      { icon: '🔟', name: 'Double Digits', req: 'Reach level 10', xp: 250, gold: 90, check: s => s.level >= 10 },
      { icon: '🏅', name: 'Seasoned', req: 'Reach level 20', xp: 600, gold: 220, check: s => s.level >= 20 },
      { icon: '👑', name: 'Sovereign', req: 'Reach level 30', xp: 1400, gold: 500, check: s => s.level >= 30 },
      { icon: '🌠', name: 'Beyond Rank', req: 'Reach level 50', xp: 3000, gold: 1000, check: s => s.level >= 50 },
    ],
  },
  {
    id: 'sm10', icon: '💀', name: 'Hunter of Monsters', color: '#ff2d55',
    steps: [
      { icon: '🐉', name: 'One Down', req: 'Defeat 1 boss', xp: 150, gold: 55, check: s => s.bosses.length >= 1 },
      { icon: '⚔️', name: 'Three Fallen', req: 'Defeat 3 bosses', xp: 500, gold: 180, check: s => s.bosses.length >= 3 },
      { icon: '☠️', name: 'Five Fallen', req: 'Defeat 5 bosses', xp: 1100, gold: 400, check: s => s.bosses.length >= 5 },
      { icon: '🏆', name: 'The Board Is Clear', req: 'Defeat all 7 bosses', xp: 2500, gold: 900, check: s => s.bosses.length >= 7 },
    ],
  },
  {
    id: 'sm11', icon: '🎖️', name: 'Collector Arc', color: '#b18cff',
    steps: [
      { icon: '🎁', name: 'First Drop', req: 'Collect 1 item', xp: 80, gold: 25, check: s => s.inventory.length >= 1 },
      { icon: '🎒', name: 'Kitted Out', req: 'Collect 8 items', xp: 220, gold: 80, check: s => s.inventory.length >= 8 },
      { icon: '🏵️', name: 'Decorated', req: 'Earn 10 achievements', xp: 500, gold: 180, check: s => s.achievements.length >= 10 },
      { icon: '💎', name: 'Hoarder of Legends', req: 'Collect a legendary item', xp: 1200, gold: 430, check: s => s.inventory.some(i => i.rarity === 'legendary') },
    ],
  },
  {
    id: 'sm12', icon: '⏳', name: 'The Hours Arc', color: '#5ef2ff',
    steps: [
      { icon: '🕐', name: 'One Hour In', req: 'Log 60 total workout minutes', xp: 90, gold: 30, check: s => s.totalWorkoutMin >= 60 },
      { icon: '🕔', name: 'Five Hours', req: 'Log 300 total workout minutes', xp: 260, gold: 95, check: s => s.totalWorkoutMin >= 300 },
      { icon: '🕛', name: 'Twenty Hours', req: 'Log 1,200 total workout minutes', xp: 700, gold: 250, check: s => s.totalWorkoutMin >= 1200 },
      { icon: '🌘', name: 'One Hundred Hours', req: 'Log 6,000 total workout minutes', xp: 2500, gold: 900, check: s => s.totalWorkoutMin >= 6000 },
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
  { id: 'tm4', icon: '🏋️', name: 'Strength', unit: 'min', tiers: [{ lvl: 'Easy', v: 15 }, { lvl: 'Normal', v: 40 }, { lvl: 'Hard', v: 75 }], xp: [60, 130, 240], gold: [20, 48, 95] },
  { id: 'tm5', icon: '🧘', name: 'Stillness', unit: 'min', tiers: [{ lvl: 'Easy', v: 5 }, { lvl: 'Normal', v: 15 }, { lvl: 'Hard', v: 30 }], xp: [45, 95, 190], gold: [16, 35, 75] },
  { id: 'tm6', icon: '🔁', name: 'Sessions', unit: 'logged', tiers: [{ lvl: 'Easy', v: 1 }, { lvl: 'Normal', v: 3 }, { lvl: 'Hard', v: 5 }], xp: [50, 140, 260], gold: [18, 50, 100] },
  { id: 'tm7', icon: '⚖️', name: 'Breadth', unit: 'stats', tiers: [{ lvl: 'Easy', v: 1 }, { lvl: 'Normal', v: 3 }, { lvl: 'Hard', v: 5 }], xp: [40, 120, 280], gold: [15, 45, 110] },
];

export interface DailyChallenge {
  id: string; icon: string; name: string; desc: string; xp: number; gold: number;
  check: (s: GameState) => boolean;
}
export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'c1', icon: '🃏', name: '5x5 Day', desc: 'Log 5 workouts', xp: 200, gold: 80, check: s => s.workoutsToday >= 5 },
  { id: 'c2', icon: '🚰', name: 'Hydration Hero', desc: 'Log 3L water', xp: 150, gold: 60, check: s => s.waterToday >= 3 },
  { id: 'c3', icon: '⚡', name: 'Step Storm', desc: 'Hit 12,000 steps', xp: 180, gold: 70, check: s => s.stepsToday >= 12000 },
  { id: 'c4', icon: '🏋️', name: 'Heavy Lifts', desc: '45+ min strength', xp: 190, gold: 75, check: s => s.strengthMinToday >= 45 },
  { id: 'c5', icon: '🧠', name: 'Clear Head', desc: 'Meditate 20 min', xp: 160, gold: 65, check: s => s.meditationMinToday >= 20 },
  { id: 'c6', icon: '⚖️', name: 'Balanced', desc: 'Train 3 different stats', xp: 200, gold: 80, check: s => Object.keys(s.statsTrainedToday || {}).length >= 3 },
  { id: 'c7', icon: '3️⃣', name: 'Triple Threat', desc: 'Log 3 workouts', xp: 150, gold: 60, check: s => s.workoutsToday >= 3 },
  { id: 'c8', icon: '🫀', name: 'Cardio Hour', desc: '60+ min cardio', xp: 210, gold: 82, check: s => s.cardioMinToday >= 60 },
  { id: 'c9', icon: '🏔️', name: 'Step Marathon', desc: 'Hit 20,000 steps', xp: 260, gold: 100, check: s => s.stepsToday >= 20000 },
  { id: 'c10', icon: '⚒️', name: 'Iron Hour', desc: '60+ min strength', xp: 220, gold: 85, check: s => s.strengthMinToday >= 60 },
  { id: 'c11', icon: '🗿', name: 'Deep Focus', desc: 'Meditate 30 min', xp: 230, gold: 88, check: s => s.meditationMinToday >= 30 },
  { id: 'c12', icon: '🖐️', name: 'All Five', desc: 'Train all 5 stats today', xp: 320, gold: 120, check: s => Object.keys(s.statsTrainedToday || {}).length >= 5 },
  { id: 'c13', icon: '🌊', name: 'Hydration Flood', desc: 'Log 5L water', xp: 240, gold: 92, check: s => s.waterToday >= 5 },
  { id: 'c14', icon: '📋', name: 'Quest Sweep', desc: 'Finish 4 daily quests', xp: 200, gold: 80, check: s => s.questsDone.length >= 4 },
  { id: 'c15', icon: '👑', name: 'Quest Overload', desc: 'Finish 6 daily quests', xp: 300, gold: 115, check: s => s.questsDone.length >= 6 },
  { id: 'c16', icon: '⏳', name: 'Ninety Minutes', desc: '90 min of strength and cardio combined', xp: 250, gold: 95, check: s => (s.strengthMinToday + s.cardioMinToday) >= 90 },
  { id: 'c17', icon: '🔀', name: 'Hybrid Day', desc: '20 min strength and 20 min cardio', xp: 210, gold: 82, check: s => s.strengthMinToday >= 20 && s.cardioMinToday >= 20 },
  { id: 'c18', icon: '☯️', name: 'Mind and Body', desc: 'Train once and meditate 10 min', xp: 180, gold: 70, check: s => s.workoutsToday >= 1 && s.meditationMinToday >= 10 },
  { id: 'c19', icon: '🛌', name: 'Well Rested', desc: 'Log 8h of sleep', xp: 170, gold: 68, check: s => s.sleepHours >= 8 },
  { id: 'c20', icon: '🔗', name: 'Combo Chain', desc: 'Build a 5-step combo', xp: 200, gold: 80, check: s => (s.combo?.n || 0) >= 5 },
  { id: 'c21', icon: '🧾', name: 'Two and Two', desc: 'Log 2 workouts and 2L water', xp: 160, gold: 64, check: s => s.workoutsToday >= 2 && s.waterToday >= 2 },
  { id: 'c22', icon: '🎽', name: 'Full Kit', desc: 'Train, drink 2L, meditate 5 min', xp: 230, gold: 88, check: s => s.workoutsToday >= 1 && s.waterToday >= 2 && s.meditationMinToday >= 5 },
];

/** Counters a milestone can track. Mirrored by `milestoneStats()` in missions.ts. */
export type MilestoneStat =
  | 'workouts' | 'streak' | 'level' | 'bossCount'
  | 'minutes' | 'water' | 'achievements' | 'xp';

export interface MilestoneMission {
  id: string; icon: string; name: string; desc: string;
  target: number; stat: MilestoneStat; xp: number; gold: number;
}
export const MILESTONE_MISSIONS: MilestoneMission[] = [
  { id: 'mm1', icon: '🏆', name: 'Centurion', desc: 'Log 100 workouts', target: 100, stat: 'workouts', xp: 1000, gold: 400 },
  { id: 'mm2', icon: '🔥', name: 'Unstoppable', desc: '30-day streak', target: 30, stat: 'streak', xp: 1500, gold: 500 },
  { id: 'mm3', icon: '👑', name: 'S-Rank', desc: 'Reach S-Rank', target: 30, stat: 'level', xp: 2000, gold: 700 },
  { id: 'mm4', icon: '🐉', name: 'Boss Slayer', desc: 'Defeat 5 bosses', target: 5, stat: 'bossCount', xp: 1200, gold: 450 },
  { id: 'mm5', icon: '🌱', name: 'First Steps', desc: 'Log 10 workouts', target: 10, stat: 'workouts', xp: 200, gold: 80 },
  { id: 'mm6', icon: '🥉', name: 'Half Century', desc: 'Log 50 workouts', target: 50, stat: 'workouts', xp: 600, gold: 220 },
  { id: 'mm7', icon: '🦾', name: 'Iron Legion', desc: 'Log 250 workouts', target: 250, stat: 'workouts', xp: 2500, gold: 900 },
  { id: 'mm8', icon: '📆', name: 'Week One', desc: 'Reach a 7-day streak', target: 7, stat: 'streak', xp: 250, gold: 90 },
  { id: 'mm9', icon: '🗓️', name: 'Fortnight', desc: 'Reach a 14-day streak', target: 14, stat: 'streak', xp: 500, gold: 180 },
  { id: 'mm10', icon: '☄️', name: 'Hundred Days', desc: 'Reach a 100-day streak', target: 100, stat: 'streak', xp: 5000, gold: 1800 },
  { id: 'mm11', icon: '⬆️', name: 'Rising', desc: 'Reach level 10', target: 10, stat: 'level', xp: 400, gold: 150 },
  { id: 'mm12', icon: '🎖️', name: 'Veteran', desc: 'Reach level 20', target: 20, stat: 'level', xp: 900, gold: 320 },
  { id: 'mm13', icon: '🌠', name: 'Monarch', desc: 'Reach level 50', target: 50, stat: 'level', xp: 6000, gold: 2200 },
  { id: 'mm14', icon: '🕐', name: 'Ten Hours', desc: 'Train 600 total minutes', target: 600, stat: 'minutes', xp: 500, gold: 180 },
  { id: 'mm15', icon: '🕛', name: 'Hundred Hours', desc: 'Train 6,000 total minutes', target: 6000, stat: 'minutes', xp: 3000, gold: 1100 },
  { id: 'mm16', icon: '🌊', name: 'Ocean', desc: 'Drink 200L of water', target: 200, stat: 'water', xp: 700, gold: 250 },
  { id: 'mm17', icon: '🏵️', name: 'Decorated', desc: 'Earn 10 achievements', target: 10, stat: 'achievements', xp: 800, gold: 300 },
  { id: 'mm18', icon: '⚔️', name: 'Nemesis', desc: 'Defeat 3 bosses', target: 3, stat: 'bossCount', xp: 600, gold: 220 },
  { id: 'mm19', icon: '💀', name: 'Legend', desc: 'Defeat all 7 bosses', target: 7, stat: 'bossCount', xp: 2500, gold: 900 },
  { id: 'mm20', icon: '✨', name: 'Six Figures', desc: 'Earn 100,000 lifetime XP', target: 100000, stat: 'xp', xp: 4000, gold: 1500 },
];

export const BOOSTERS: BoosterDef[] = [
  { id: 'b_xp', icon: '🚀', name: 'XP Rush', desc: '2× XP for 30 min', cost: 150, durMin: 30, type: 'xp' },
  { id: 'b_gold', icon: '💰', name: 'Gold Fever', desc: '2× gold for 30 min', cost: 140, durMin: 30, type: 'gold' },
  { id: 'b_elixir', icon: '⚗️', name: 'Energy Elixir', desc: 'Instantly refill all energy', cost: 120, type: 'energy' },
  { id: 'b_combo', icon: '🔗', name: 'Combo Master', desc: '2× combo points for 30 min', cost: 180, durMin: 30, type: 'combo' },
  { id: 'b_luck', icon: '🍀', name: 'Lucky Charm', desc: 'Higher legendary loot chance for 30 min', cost: 200, durMin: 30, type: 'luck' },
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

export interface Tier { id: string; name: string; tag: string; value: number; perks: string[]; }
// Difficulty paths, not products. Every one is free and switchable at any time
// from the Shop; they only change your XP and gold rates.
export const PREMIUM_TIERS: Tier[] = [
  { id: 't1', name: 'Ranger', tag: '', value: 1, perks: ['+10% XP', '+15% gold', 'Steady pace'] },
  { id: 't2', name: 'Elite', tag: 'BALANCED', value: 2, perks: ['+25% XP', '+25% gold', 'Faster progression'] },
  { id: 't3', name: 'Monarch', tag: 'FASTEST', value: 3, perks: ['+40% XP', '+30% gold', 'Maximum momentum'] },
];
