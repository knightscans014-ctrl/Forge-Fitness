// Builds a realistic mid-game save for the README screenshots.
//
// The save is produced by driving the real engine rather than hand-writing
// JSON, so the numbers on screen are internally consistent -- the level
// matches the XP curve, the gear came out of the real loot tables, and the
// quest ids are ones dailyQuests() will actually surface today.
//
// Output goes to stdout as JSON. Not part of the app; used by
// tools/shoot-readme.js.
// The engine is pure TypeScript with no React Native imports, so it compiles
// to plain CommonJS and runs under bare Node. tools/shoot-readme.js builds it
// into tools/.engine-build/ before requiring this file.
const E = require('./.engine-build/engine');
// Mutating actions hang off the ENGINE namespace; the pure helpers are
// top-level exports.
const ENGINE = { ...E, ...E.ENGINE };

const s = ENGINE.newGame('KAITO', 'warrior');

// A few weeks of steady training. Logged through the public API so streaks,
// combos, achievements and loot all fire the way they would in the app.
const plan = [
  ['strength', 45, 3], ['cardio', 30, 2], ['mobility', 20, 1],
  ['strength', 60, 3], ['meditation', 15, 2], ['steps', 40, 2],
  ['recovery', 30, 1], ['strength', 50, 3], ['cardio', 45, 3],
  ['mobility', 25, 2], ['strength', 40, 2], ['meditation', 20, 2],
];
for (const [id, min, intensity] of plan) {
  ENGINE.logActivity(s, id, min, intensity);
  s.energy = 100; // keep the sim going; energy is refilled daily anyway
}

// Enough XP to sit at a rank that shows off the aura styling.
ENGINE.addXP(s, 26000);
ENGINE.addGold(s, 1450);

s.streak = 23;
s.bestStreak = 23;
s.workouts = 48;
s.totalMinutes = 1840;

// Some gear, so the character sheet is not empty. ilvl is pinned to the
// character level rather than derived from power: power already includes the
// bonuses from gear, so feeding it back in compounds into absurd numbers.
for (const slot of ['weapon', 'armor', 'accessory']) {
  const rarity = slot === 'weapon' ? 'legendary' : slot === 'armor' ? 'epic' : 'rare';
  const item = ENGINE.forgeGear(slot, rarity, s.level);
  s.inventory.push(item);
  s.equipped[slot] = item.id;
}

s.hp = Math.round(ENGINE.effectiveMaxHP(s) * 0.82);
s.energy = 74;
s.skillPoints = 3;

process.stdout.write(JSON.stringify(ENGINE.normalize(s)));
