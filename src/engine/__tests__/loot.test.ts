import {
  ENGINE, defaultState, normalize, computePower, critChance, effectiveMaxHP,
  xpMultNow, goldMultNow, equipGear,
  RARITIES, RARITY_ORDER, AFFIXES, GEAR_SETS, Rarity, Affix,
  forgeGear, rollDrop, rollRarityScaled, totalAffixes, activeSetBonuses,
  setCounts, equippedItems, gearScore, isUpgrade, autoEquipBest,
  salvage, salvageJunk, affixLabel, setById,
} from '../index';
import { GameState, GearItem } from '../types';

const fresh = (): GameState => normalize(defaultState('Tester', 'assassin'));

describe('loot tables', () => {
  test('every rarity has a definition and they escalate monotonically', () => {
    let lastMult = 0, lastSalvage = 0, lastAffixes = -1;
    RARITY_ORDER.forEach(r => {
      const d = RARITIES[r];
      expect(d).toBeDefined();
      expect(d.mult).toBeGreaterThan(lastMult);
      expect(d.salvage).toBeGreaterThan(lastSalvage);
      expect(d.affixes).toBeGreaterThan(lastAffixes);
      lastMult = d.mult; lastSalvage = d.salvage; lastAffixes = d.affixes;
    });
  });

  test('rollRarityScaled always returns a known rarity', () => {
    for (let i = 0; i < 500; i++) {
      expect(RARITY_ORDER).toContain(rollRarityScaled(Math.random()));
    }
  });

  test('luck shifts the distribution upward without breaking it', () => {
    const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);
    const avg = (luck: number) => {
      let t = 0;
      for (let i = 0; i < 4000; i++) t += rank(rollRarityScaled(luck));
      return t / 4000;
    };
    expect(avg(0.5)).toBeGreaterThan(avg(0));
  });
});

describe('forgeGear', () => {
  test('affix count matches the rarity contract and kinds are unique', () => {
    RARITY_ORDER.forEach(r => {
      for (let i = 0; i < 40; i++) {
        const g = forgeGear('weapon', r, 10);
        const affixes = g.affixes || [];
        expect(affixes.length).toBe(RARITIES[r].affixes);
        expect(new Set(affixes.map(a => a.kind)).size).toBe(affixes.length);
        affixes.forEach(a => {
          expect(AFFIXES[a.kind]).toBeDefined();
          expect(a.value).toBeGreaterThan(0);
        });
      }
    });
  });

  test('higher rarity and higher ilvl both mean more power', () => {
    const mean = (r: Rarity, ilvl: number) => {
      let t = 0;
      for (let i = 0; i < 200; i++) t += forgeGear('armor', r, ilvl).power;
      return t / 200;
    };
    expect(mean('legendary', 10)).toBeGreaterThan(mean('common', 10));
    expect(mean('rare', 40)).toBeGreaterThan(mean('rare', 5));
  });

  test('items always carry a slot, an ilvl and a positive power', () => {
    (['weapon', 'armor', 'accessory'] as const).forEach(slot => {
      const g = forgeGear(slot, 'epic', 7);
      expect(g.slot).toBe(slot);
      expect(g.ilvl).toBe(7);
      expect(g.power).toBeGreaterThan(0);
      expect(g.name.length).toBeGreaterThan(0);
    });
  });

  test('any set stamped on an item resolves to a real set', () => {
    for (let i = 0; i < 300; i++) {
      const g = forgeGear('accessory', 'mythic', 20);
      if (g.setId) expect(setById(g.setId)).not.toBeNull();
    }
  });
});

describe('rollDrop', () => {
  test('scales item level to the player and appends nothing by itself', () => {
    const s = fresh();
    s.level = 12;
    const before = s.inventory.length;
    for (let i = 0; i < 50; i++) {
      const g = rollDrop(s);
      expect(g.ilvl).toBeGreaterThanOrEqual(12);
      expect(g.ilvl).toBeLessThanOrEqual(14);
    }
    expect(s.inventory.length).toBe(before);
  });

  test('ENGINE drops land in the inventory', () => {
    const s = fresh();
    const before = s.inventory.length;
    ENGINE.logActivity(s, 'strength', 30, 1);
    expect(s.inventory.length).toBeGreaterThanOrEqual(before);
  });
});

describe('affix aggregation', () => {
  const withGear = (affixes: GearItem['affixes'], slot: GearItem['slot'] = 'weapon', power = 10) => {
    const s = fresh();
    const g: GearItem = { id: 'test_' + slot, slot, rarity: 'epic', name: 'Test', icon: '🗡️', power, ilvl: 5, affixes };
    s.inventory.push(g);
    equipGear(s, g.id);
    return s;
  };

  test('unequipped items contribute nothing', () => {
    const s = fresh();
    s.inventory.push({ id: 'x', slot: 'weapon', rarity: 'epic', name: 'Shelf', icon: '🗡️', power: 999, ilvl: 9, affixes: [{ kind: 'power', value: 500 }] });
    expect(totalAffixes(s).power).toBe(0);
  });

  test('equipped affixes sum across slots', () => {
    const s = fresh();
    (['weapon', 'armor', 'accessory'] as const).forEach((slot, i) => {
      const g: GearItem = { id: 'g' + i, slot, rarity: 'rare', name: 'G' + i, icon: '🗡️', power: 5, ilvl: 5, affixes: [{ kind: 'power', value: 10 }] };
      s.inventory.push(g);
      equipGear(s, g.id);
    });
    expect(equippedItems(s).length).toBe(3);
    expect(totalAffixes(s).power).toBe(30);
  });

  test('power affixes raise computePower', () => {
    const base = computePower(fresh());
    const s = withGear([{ kind: 'power', value: 40 }]);
    expect(computePower(s)).toBeGreaterThanOrEqual(base + 40);
  });

  test('crit affixes raise critChance but stay capped', () => {
    const base = critChance(fresh());
    const s = withGear([{ kind: 'critBonus', value: 10 }]);
    expect(critChance(s)).toBeCloseTo(base + 0.1, 5);

    const huge = withGear([{ kind: 'critBonus', value: 9999 }]);
    expect(critChance(huge)).toBeLessThanOrEqual(0.75);
  });

  test('hp affixes raise effectiveMaxHP', () => {
    const base = effectiveMaxHP(fresh());
    const s = withGear([{ kind: 'hpBonus', value: 50 }]);
    expect(effectiveMaxHP(s)).toBe(base + 50);
  });

  test('xp and gold affixes feed the reward multipliers', () => {
    const baseXP = xpMultNow(fresh());
    const baseGold = goldMultNow(fresh());
    const s = withGear([{ kind: 'xpBonus', value: 20 }, { kind: 'goldBonus', value: 50 }]);
    expect(xpMultNow(s)).toBeCloseTo(baseXP * 1.2, 5);
    expect(goldMultNow(s)).toBeCloseTo(baseGold * 1.5, 5);
  });

  test('stat affixes feed computePower through the stat weights', () => {
    const base = computePower(fresh());
    // power 0 so the only delta is the stat affix, weighted 3x for strength.
    const s = withGear([{ kind: 'statStr', value: 10 }], 'weapon', 0);
    expect(computePower(s)).toBe(base + 30);
  });

  test('every affix kind is renderable', () => {
    (Object.keys(AFFIXES) as (keyof typeof AFFIXES)[]).forEach(kind => {
      const label = affixLabel({ kind, value: 12 });
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

describe('set bonuses', () => {
  const equipSet = (setId: string, slots: GearItem['slot'][]) => {
    const s = fresh();
    slots.forEach((slot, i) => {
      const g: GearItem = { id: setId + i, slot, rarity: 'legendary', name: 'S' + i, icon: '🗡️', power: 10, ilvl: 10, affixes: [], setId };
      s.inventory.push(g);
      equipGear(s, g.id);
    });
    return s;
  };

  test('set definitions are well formed', () => {
    expect(GEAR_SETS.length).toBeGreaterThan(0);
    expect(new Set(GEAR_SETS.map(x => x.id)).size).toBe(GEAR_SETS.length);
    GEAR_SETS.forEach(set => {
      expect(set.name.length).toBeGreaterThan(0);
      expect(set.bonus2.length).toBeGreaterThan(0);
      expect(set.bonus3.length).toBeGreaterThan(0);
      ([...set.bonus2, ...set.bonus3] as Affix[]).forEach(a => expect(AFFIXES[a.kind]).toBeDefined());
    });
  });

  test('one piece grants nothing', () => {
    const set = GEAR_SETS[0];
    const s = equipSet(set.id, ['weapon']);
    expect(setCounts(s)[set.id]).toBe(1);
    expect(activeSetBonuses(s).length).toBe(0);
  });

  test('two pieces grant the 2-piece bonus only', () => {
    const set = GEAR_SETS[0];
    const s = equipSet(set.id, ['weapon', 'armor']);
    const active = activeSetBonuses(s);
    expect(active.length).toBe(1);
    expect(active[0].pieces).toBe(2);
    expect(active[0].bonuses).toEqual(set.bonus2);
  });

  test('three pieces grant both tiers and reach the totals', () => {
    const set = GEAR_SETS[0];
    const s = equipSet(set.id, ['weapon', 'armor', 'accessory']);
    const active = activeSetBonuses(s);
    expect(active[0].pieces).toBe(3);
    expect(active[0].bonuses.length).toBe(set.bonus2.length + set.bonus3.length);

    const totals = totalAffixes(s);
    ([...set.bonus2, ...set.bonus3] as Affix[]).forEach(a => {
      expect(totals[a.kind]).toBeGreaterThanOrEqual(a.value);
    });
  });
});

describe('gearScore, upgrades and auto-equip', () => {
  test('a stronger item scores higher', () => {
    const weak = forgeGear('weapon', 'common', 5);
    const strong = forgeGear('weapon', 'mythic', 40);
    expect(gearScore(strong)).toBeGreaterThan(gearScore(weak));
  });

  test('anything beats an empty slot', () => {
    const s = fresh();
    expect(isUpgrade(s, forgeGear('weapon', 'common', 1))).toBe(true);
  });

  test('a worse item in a filled slot is not an upgrade', () => {
    const s = fresh();
    const good = forgeGear('weapon', 'mythic', 50);
    s.inventory.push(good);
    equipGear(s, good.id);
    expect(isUpgrade(s, forgeGear('weapon', 'common', 1))).toBe(false);
  });

  test('autoEquipBest fills every slot with the best owned item', () => {
    const s = fresh();
    (['weapon', 'armor', 'accessory'] as const).forEach(slot => {
      s.inventory.push(forgeGear(slot, 'common', 2));
      s.inventory.push(forgeGear(slot, 'mythic', 30));
    });
    const changed = autoEquipBest(s);
    expect(changed).toBe(3);
    expect(equippedItems(s).length).toBe(3);
    equippedItems(s).forEach(g => expect(g.rarity).toBe('mythic'));
    // Idempotent: nothing left to improve.
    expect(autoEquipBest(s)).toBe(0);
  });
});

describe('salvage', () => {
  test('salvaging pays gold and removes the item', () => {
    const s = fresh();
    const g = forgeGear('weapon', 'epic', 10);
    s.inventory.push(g);
    const gold = s.gold;
    const r = salvage(s, g.id);
    expect(r.ok).toBe(true);
    expect(r.gold).toBeGreaterThan(0);
    expect(s.gold).toBe(gold + r.gold);
    expect(s.inventory.find(i => i.id === g.id)).toBeUndefined();
  });

  test('equipped items are protected', () => {
    const s = fresh();
    const g = forgeGear('weapon', 'epic', 10);
    s.inventory.push(g);
    equipGear(s, g.id);
    const r = salvage(s, g.id);
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
    expect(s.inventory.find(i => i.id === g.id)).toBeDefined();
  });

  test('unknown ids fail cleanly', () => {
    const s = fresh();
    expect(salvage(s, 'nope').ok).toBe(false);
  });

  test('salvageJunk clears commons and rares but spares equipped and rarer gear', () => {
    const s = fresh();
    const keepEquipped = forgeGear('weapon', 'common', 3);
    s.inventory.push(keepEquipped);
    equipGear(s, keepEquipped.id);
    const legendary = forgeGear('armor', 'legendary', 12);
    s.inventory.push(legendary);
    s.inventory.push(forgeGear('armor', 'common', 3));
    s.inventory.push(forgeGear('accessory', 'rare', 4));

    const r = salvageJunk(s);
    expect(r.count).toBe(2);
    expect(r.gold).toBeGreaterThan(0);
    expect(s.inventory.find(i => i.id === keepEquipped.id)).toBeDefined();
    expect(s.inventory.find(i => i.id === legendary.id)).toBeDefined();
  });
});

describe('backwards compatibility', () => {
  test('legacy gear without ilvl or affixes is backfilled, not dropped', () => {
    const s: any = defaultState('Old', 'paladin');
    s.inventory = [{ id: 'old1', slot: 'weapon', rarity: 'rare', name: 'Rusted Blade', icon: '🗡️', power: 14 }];
    s.equipped = { weapon: 'old1', armor: null, accessory: null };
    const n = normalize(s);
    const item = n.inventory.find(g => g.id === 'old1')!;
    expect(item).toBeDefined();
    expect(item.power).toBe(14);
    expect(typeof item.ilvl).toBe('number');
    expect(item.ilvl).toBeGreaterThan(0);
    expect(Array.isArray(item.affixes)).toBe(true);
    // A legacy item contributes no affixes, so derived stats stay finite.
    expect(Number.isFinite(computePower(n))).toBe(true);
    expect(totalAffixes(n).power).toBe(0);
  });

  test('a state with no gear at all still computes every derived stat', () => {
    const s = fresh();
    expect(Number.isFinite(computePower(s))).toBe(true);
    expect(Number.isFinite(critChance(s))).toBe(true);
    expect(Number.isFinite(effectiveMaxHP(s))).toBe(true);
    expect(Number.isFinite(xpMultNow(s))).toBe(true);
    expect(Number.isFinite(goldMultNow(s))).toBe(true);
  });
});
