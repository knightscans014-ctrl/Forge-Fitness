/**
 * LOOT DEPTH — affixes, sets, scaling and salvage.
 *
 * The original drop system produced a name and a single `power` number, which
 * gives a player nothing to think about: a bigger number is strictly better, so
 * there is no decision, only arithmetic. Depth here comes from *tension between
 * axes* — a rare with two good affixes can beat an epic with one, and a set
 * bonus can be worth wearing a slightly weaker piece for.
 *
 * Everything is additive over the existing GearItem: `power` still exists and
 * still means what it meant, so old saves keep working untouched. New fields
 * are optional and `normalize()` backfills them.
 */
import type { GameState, GearItem } from './types';
// boosterActive lives in state.ts, which imports this module for affix maths.
// Required lazily at the call site to keep that cycle from forming at import
// time.
function boosterActive(s: GameState, id: string): unknown {
  return require('./state').boosterActive(s, id);
}

/* ------------------------------------------------------------------ */
/* Rarity                                                              */
/* ------------------------------------------------------------------ */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export interface RarityDef {
  id: Rarity;
  name: string;
  color: string;
  /** Multiplier on base item power. */
  mult: number;
  /** How many affixes an item of this rarity rolls. */
  affixes: number;
  /** Gold returned when salvaged. */
  salvage: number;
}

export const RARITIES: Record<Rarity, RarityDef> = {
  common:    { id: 'common',    name: 'Common',    color: '#9fb0c8', mult: 1.0, affixes: 0, salvage: 8 },
  rare:      { id: 'rare',      name: 'Rare',      color: '#4dc3ff', mult: 1.8, affixes: 1, salvage: 25 },
  epic:      { id: 'epic',      name: 'Epic',      color: '#b18cff', mult: 2.9, affixes: 2, salvage: 70 },
  legendary: { id: 'legendary', name: 'Legendary', color: '#ffd166', mult: 4.4, affixes: 3, salvage: 180 },
  mythic:    { id: 'mythic',    name: 'Mythic',    color: '#ff4d8f', mult: 6.5, affixes: 4, salvage: 450 },
};

/* ------------------------------------------------------------------ */
/* Affixes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Affixes are the actual decision layer. They are deliberately NOT all
 * combat-facing: `xpBonus` and `goldBonus` compete with raw power, so a player
 * chasing levels and a player chasing a boss kill want different gear.
 */
export type AffixKind =
  | 'power' | 'xpBonus' | 'goldBonus' | 'critBonus'
  | 'hpBonus' | 'energyBonus' | 'statStr' | 'statVig' | 'statVit' | 'statFlx' | 'statFoc';

export interface AffixDef {
  kind: AffixKind;
  label: string;
  /** Value per point of item level, roughly. */
  scale: number;
  /** Rendered as a percentage rather than a flat number. */
  pct?: boolean;
}

export const AFFIXES: Record<AffixKind, AffixDef> = {
  power:       { kind: 'power',       label: 'Power',        scale: 1.6 },
  xpBonus:     { kind: 'xpBonus',     label: 'XP Gain',      scale: 0.9, pct: true },
  goldBonus:   { kind: 'goldBonus',   label: 'Gold Gain',    scale: 1.2, pct: true },
  critBonus:   { kind: 'critBonus',   label: 'Crit Chance',  scale: 0.5, pct: true },
  hpBonus:     { kind: 'hpBonus',     label: 'Max HP',       scale: 2.2 },
  energyBonus: { kind: 'energyBonus', label: 'Max Energy',   scale: 0.3 },
  statStr:     { kind: 'statStr',     label: 'STR',          scale: 0.6 },
  statVig:     { kind: 'statVig',     label: 'VIG',          scale: 0.6 },
  statVit:     { kind: 'statVit',     label: 'VIT',          scale: 0.6 },
  statFlx:     { kind: 'statFlx',     label: 'FLX',          scale: 0.6 },
  statFoc:     { kind: 'statFoc',     label: 'FOC',          scale: 0.6 },
};

export interface Affix {
  kind: AffixKind;
  value: number;
}

const AFFIX_POOL: AffixKind[] = [
  'power', 'power', 'xpBonus', 'goldBonus', 'critBonus', 'hpBonus', 'energyBonus',
  'statStr', 'statVig', 'statVit', 'statFlx', 'statFoc',
];

/* ------------------------------------------------------------------ */
/* Sets                                                                */
/* ------------------------------------------------------------------ */

/**
 * Set bonuses are the long-tail chase. Two pieces is achievable and gives a
 * real nudge; three is a genuine commitment because it locks all your slots.
 */
export interface SetDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Bonus at 2 pieces and at 3 pieces, as affix-style effects. */
  bonus2: Affix[];
  bonus3: Affix[];
  flavor: string;
}

export const GEAR_SETS: SetDef[] = [
  {
    id: 'ironblood', name: 'Ironblood', icon: '🩸', color: '#ff5d73',
    bonus2: [{ kind: 'power', value: 15 }],
    bonus3: [{ kind: 'power', value: 40 }, { kind: 'hpBonus', value: 30 }],
    flavor: 'Forged for those who finish the set.',
  },
  {
    id: 'skywalker', name: 'Skyward', icon: '🌤️', color: '#4dc3ff',
    bonus2: [{ kind: 'energyBonus', value: 5 }],
    bonus3: [{ kind: 'energyBonus', value: 12 }, { kind: 'xpBonus', value: 10 }],
    flavor: 'Light enough to run all day.',
  },
  {
    id: 'goldhand', name: 'Goldhand', icon: '💰', color: '#ffd166',
    bonus2: [{ kind: 'goldBonus', value: 15 }],
    bonus3: [{ kind: 'goldBonus', value: 40 }, { kind: 'power', value: 20 }],
    flavor: 'Every rep pays.',
  },
  {
    id: 'voidmonk', name: 'Void Monk', icon: '🌑', color: '#b18cff',
    bonus2: [{ kind: 'critBonus', value: 6 }],
    bonus3: [{ kind: 'critBonus', value: 15 }, { kind: 'statFoc', value: 10 }],
    flavor: 'Stillness, sharpened into a weapon.',
  },
];

export function setById(id?: string): SetDef | null {
  return id ? GEAR_SETS.find(x => x.id === id) || null : null;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const NAMES: Record<string, string[]> = {
  weapon: ['Rusted Edge', 'Iron Longsword', 'Storm Fang', 'Dragonfang Saber', 'Blade of Dawn', 'Sunder', 'Grim Cleaver', 'Whisperfang'],
  armor: ['Worn Cuirass', 'Reinforced Plate', 'Void Mail', 'Aegis of Might', 'Titan Plate', 'Bulwark', 'Ashen Guard', 'Wyrmscale'],
  accessory: ['Old Charm', 'Frost Ring', 'Phoenix Amulet', 'Soul Amulet', 'Crown of Will', 'Ember Sigil', 'Tidecaller', 'Oath Band'],
};
const ICONS: Record<string, string> = { weapon: '🗡️', armor: '🛡️', accessory: '🧿' };

const PREFIX: Record<Rarity, string[]> = {
  common: ['Plain', 'Worn'],
  rare: ['Keen', 'Sturdy', 'Swift'],
  epic: ['Ruinous', 'Ascendant', 'Stormforged'],
  legendary: ['Godtouched', 'Eternal', 'Worldbreaker'],
  mythic: ['Apocryphal', 'Starforged', 'Undying'],
};

export function rollRarityScaled(luck = 0): Rarity {
  // Rarer tiers occupy the HIGH end of the range, so luck must be added.
  // Subtracting here made the Luck booster reduce drop quality.
  const r = Math.random() + luck;
  if (r < 0.44) return 'common';
  if (r < 0.74) return 'rare';
  if (r < 0.91) return 'epic';
  if (r < 0.985) return 'legendary';
  return 'mythic';
}

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

/**
 * Build an item. `ilvl` (item level) drives magnitude, so drops from a level-40
 * player meaningfully outclass level-5 drops without needing separate tables.
 */
export function forgeGear(slot: GearItem['slot'], rarity: Rarity, ilvl: number): GearItem {
  const def = RARITIES[rarity];
  const base = Math.max(3, Math.round(ilvl * 1.1 + 4));
  const power = Math.round(base * def.mult * (0.85 + Math.random() * 0.3));

  const affixes: Affix[] = [];
  const usedKinds = new Set<AffixKind>();
  for (let i = 0; i < def.affixes; i++) {
    let kind = pick(AFFIX_POOL);
    let guard = 0;
    while (usedKinds.has(kind) && guard++ < 12) kind = pick(AFFIX_POOL);
    usedKinds.add(kind);
    const a = AFFIXES[kind];
    const v = Math.max(1, Math.round(a.scale * (ilvl * 0.35 + 2) * (0.8 + Math.random() * 0.5)));
    affixes.push({ kind, value: v });
  }

  // Higher rarities are more likely to belong to a set, giving the chase a
  // natural difficulty curve.
  const setChance = { common: 0, rare: 0.12, epic: 0.28, legendary: 0.45, mythic: 0.7 }[rarity];
  const setId = Math.random() < setChance ? pick(GEAR_SETS).id : undefined;

  const prefix = pick(PREFIX[rarity]);
  const baseName = pick(NAMES[slot]);
  const setDef = setById(setId);

  return {
    id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    slot,
    rarity: rarity as GearItem['rarity'],
    name: setDef ? `${setDef.name} ${baseName}` : `${prefix} ${baseName}`,
    power,
    icon: ICONS[slot],
    ilvl,
    affixes,
    setId,
  };
}

/** Drop an item scaled to the player, honouring the Lucky Charm booster. */
export function rollDrop(s: GameState, bonusLuck = 0): GearItem {
  const luck = (boosterActive(s, 'b_luck') ? 0.18 : 0) + bonusLuck;
  const rarity = rollRarityScaled(luck);
  const slots: GearItem['slot'][] = ['weapon', 'armor', 'accessory'];
  const ilvl = Math.max(1, s.level + Math.floor(Math.random() * 3));
  return forgeGear(pick(slots), rarity, ilvl);
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export type AffixTotals = Record<AffixKind, number>;

function emptyTotals(): AffixTotals {
  return {
    power: 0, xpBonus: 0, goldBonus: 0, critBonus: 0, hpBonus: 0, energyBonus: 0,
    statStr: 0, statVig: 0, statVit: 0, statFlx: 0, statFoc: 0,
  };
}

export function equippedItems(s: GameState): GearItem[] {
  const out: GearItem[] = [];
  (['weapon', 'armor', 'accessory'] as const).forEach(slot => {
    const id = s.equipped[slot];
    if (!id) return;
    const g = s.inventory.find(x => x.id === id);
    if (g) out.push(g);
  });
  return out;
}

/** How many pieces of each set are currently worn. */
export function setCounts(s: GameState): Record<string, number> {
  const c: Record<string, number> = {};
  equippedItems(s).forEach(g => {
    if (g.setId) c[g.setId] = (c[g.setId] || 0) + 1;
  });
  return c;
}

/** Which set bonuses are currently live. */
export function activeSetBonuses(s: GameState): { set: SetDef; pieces: number; bonuses: Affix[] }[] {
  const counts = setCounts(s);
  const out: { set: SetDef; pieces: number; bonuses: Affix[] }[] = [];
  Object.entries(counts).forEach(([id, n]) => {
    const def = setById(id);
    if (!def || n < 2) return;
    const bonuses = n >= 3 ? [...def.bonus2, ...def.bonus3] : [...def.bonus2];
    out.push({ set: def, pieces: n, bonuses });
  });
  return out;
}

/**
 * Every affix the player currently benefits from: item affixes plus live set
 * bonuses. This is the single source of truth the rest of the engine reads, so
 * adding a new affix source later means touching exactly one function.
 */
export function totalAffixes(s: GameState): AffixTotals {
  const t = emptyTotals();
  equippedItems(s).forEach(g => {
    (g.affixes || []).forEach(a => { t[a.kind] = (t[a.kind] || 0) + a.value; });
  });
  activeSetBonuses(s).forEach(b => {
    b.bonuses.forEach(a => { t[a.kind] = (t[a.kind] || 0) + a.value; });
  });
  return t;
}

/** Human-readable affix line, e.g. "+12% XP Gain". */
export function affixLabel(a: Affix): string {
  const d = AFFIXES[a.kind];
  if (!d) return '';
  return d.pct ? `+${a.value}% ${d.label}` : `+${a.value} ${d.label}`;
}

/**
 * A single comparable number for "how good is this item for me right now".
 * Used to sort the inventory and to mark upgrades, so the player is never
 * forced to do mental arithmetic across four axes.
 */
export function gearScore(g: GearItem): number {
  let score = g.power;
  (g.affixes || []).forEach(a => {
    const weight: Partial<Record<AffixKind, number>> = {
      power: 1, hpBonus: 0.5, energyBonus: 3, critBonus: 2.5,
      xpBonus: 1.5, goldBonus: 1, statStr: 1.5, statVig: 1.5,
      statVit: 1.2, statFlx: 1.2, statFoc: 1.2,
    };
    score += a.value * (weight[a.kind] ?? 1);
  });
  if (g.setId) score += 8; // set membership has option value
  return Math.round(score);
}

/** Is this a straight upgrade over what is worn in its slot? */
export function isUpgrade(s: GameState, g: GearItem): boolean {
  const cur = s.inventory.find(x => x.id === s.equipped[g.slot]);
  if (!cur) return true;
  return gearScore(g) > gearScore(cur);
}

/** Auto-equip the best-scoring item in each slot. Returns how many changed. */
export function autoEquipBest(s: GameState): number {
  let changed = 0;
  (['weapon', 'armor', 'accessory'] as const).forEach(slot => {
    const candidates = s.inventory.filter(g => g.slot === slot);
    if (!candidates.length) return;
    const best = candidates.reduce((a, b) => (gearScore(b) > gearScore(a) ? b : a));
    if (s.equipped[slot] !== best.id) {
      s.equipped[slot] = best.id;
      changed++;
    }
  });
  return changed;
}

/**
 * Salvage an item for gold. Refuses to destroy equipped gear — an irreversible
 * destructive action behind a single tap needs a guard, not a confirm dialog
 * the player will learn to dismiss.
 */
export function salvage(s: GameState, id: string): { ok: boolean; gold: number; reason?: string } {
  const idx = s.inventory.findIndex(g => g.id === id);
  if (idx < 0) return { ok: false, gold: 0, reason: 'Item not found.' };
  const g = s.inventory[idx];
  const equipped = Object.values(s.equipped).includes(id);
  if (equipped) return { ok: false, gold: 0, reason: 'Unequip it first.' };
  const def = RARITIES[(g.rarity as Rarity)] || RARITIES.common;
  const gold = Math.round(def.salvage * (1 + (g.ilvl || 1) * 0.04));
  s.inventory.splice(idx, 1);
  s.gold += gold;
  return { ok: true, gold };
}

/** Salvage everything common/rare that is not equipped. */
export function salvageJunk(s: GameState): { count: number; gold: number } {
  const junk = s.inventory.filter(
    g => (g.rarity === 'common' || g.rarity === 'rare') && !Object.values(s.equipped).includes(g.id),
  );
  let gold = 0;
  junk.forEach(g => { const r = salvage(s, g.id); if (r.ok) gold += r.gold; });
  return { count: junk.length, gold };
}
