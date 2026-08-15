// Gear inventory + equipping.

import { GameState, GearItem } from './types';

export const SLOTS: GearItem['slot'][] = ['weapon', 'armor', 'accessory'];

export function gearById(s: GameState, id?: string): GearItem | null {
  return id ? s.inventory.find(g => g.id === id) || null : null;
}
export function equippedCount(s: GameState): number {
  let c = 0;
  SLOTS.forEach(slot => { if (s.equipped[slot]) c++; });
  return c;
}
export function equipGear(s: GameState, id: string): boolean {
  const g = gearById(s, id);
  if (!g) return false;
  s.equipped[g.slot] = id;
  return true;
}
export function unequipSlot(s: GameState, slot: GearItem['slot']): void {
  delete s.equipped[slot];
}
export function gearPower(s: GameState): number {
  let p = 0;
  SLOTS.forEach(slot => {
    const g = gearById(s, s.equipped[slot]);
    if (g) p += g.power;
  });
  return p;
}
