// Server-authority entitlement tests.
//
// The threat model: the save file lives in AsyncStorage on a device the
// attacker controls. Flipping `premium: true` there must NOT grant the XP/gold
// multipliers once the server has told us what the user is actually entitled to.

import {
  defaultState,
  isPremium,
  tierValue,
  xpMultNow,
  goldMultNow,
  setServerEntitlement,
  clearServerAuthority,
} from '../state';

describe('entitlement authority', () => {
  afterEach(() => clearServerAuthority());

  test('local save edit grants premium when there is no server verdict (offline fallback)', () => {
    const s = defaultState('Hero', 'warrior');
    s.premium = true;
    s.tier = 't3';
    expect(isPremium(s)).toBe(true);
    expect(tierValue(s)).toBeGreaterThan(0);
  });

  test('hacked save is ignored once the server says not premium', () => {
    const s = defaultState('Hero', 'warrior');
    s.premium = true;      // attacker edit
    s.tier = 't3';         // attacker edit
    setServerEntitlement({ isPremium: false, tier: null });
    expect(isPremium(s)).toBe(false);
    expect(tierValue(s)).toBe(0);
  });

  test('hacked save gets no XP or gold boost under server authority', () => {
    const clean = defaultState('Hero', 'warrior');
    setServerEntitlement({ isPremium: false, tier: null });
    const baseXP = xpMultNow(clean);
    const baseGold = goldMultNow(clean);

    const hacked = defaultState('Hero', 'warrior');
    hacked.premium = true;
    hacked.tier = 't3';
    hacked.creatorCode = true;
    expect(xpMultNow(hacked)).toBeCloseTo(baseXP);
    expect(goldMultNow(hacked)).toBeCloseTo(baseGold);
  });

  test('a genuine paying user still gets their tier even with a blank local save', () => {
    const s = defaultState('Hero', 'warrior');
    s.premium = false; // local save never updated (fresh reinstall)
    setServerEntitlement({ isPremium: true, tier: 't3' });
    expect(isPremium(s)).toBe(true);
    expect(tierValue(s)).toBeGreaterThan(0);
    expect(xpMultNow(s)).toBeGreaterThan(1);
  });

  test('the server verdict can be downgraded (expiry/refund) at runtime', () => {
    const s = defaultState('Hero', 'warrior');
    setServerEntitlement({ isPremium: true, tier: 't3' });
    const boosted = xpMultNow(s);
    setServerEntitlement({ isPremium: false, tier: null });
    expect(xpMultNow(s)).toBeLessThan(boosted);
  });
});
