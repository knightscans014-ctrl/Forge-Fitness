import { defaultState, addXP, ENGINE } from '../index';
import { exportSave, importSave, describeSave, SAVE_FORMAT } from '../../services/saveFile';

function played() {
  const s = defaultState('Kaito', 'assassin');
  s.energy = 999;
  addXP(s, 4000);
  s.gold = 720;
  s.workouts = 11;
  s.streak = 5;
  s.bestStreak = 9;
  ENGINE.dailyQuests(s).slice(0, 2).forEach(q => ENGINE.completeQuest(s, q.id));
  return s;
}

describe('save export / import', () => {
  test('a save survives a round trip intact', () => {
    const before = played();
    const after = importSave(exportSave(before));
    expect(after.ok).toBe(true);
    if (!after.ok) return;

    expect(after.state.name).toBe(before.name);
    expect(after.state.cls).toBe(before.cls);
    expect(after.state.level).toBe(before.level);
    expect(after.state.totalXP).toBe(before.totalXP);
    expect(after.state.gold).toBe(before.gold);
    expect(after.state.workouts).toBe(before.workouts);
    expect(after.state.bestStreak).toBe(before.bestStreak);
    expect(after.state.questsDone).toEqual(before.questsDone);
    expect(after.state.stats).toEqual(before.stats);
  });

  test('the export is readable text with a versioned envelope', () => {
    const blob = exportSave(played());
    const parsed = JSON.parse(blob);
    expect(parsed.app).toBe('FORGE');
    expect(parsed.format).toBe(SAVE_FORMAT);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.state.name).toBe('Kaito');
    expect(blob).toContain('\n'); // pretty-printed, so a human can read it
  });

  test('accepts a bare state object, not just the envelope', () => {
    const s = played();
    const res = importSave(JSON.stringify(s));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.name).toBe('Kaito');
  });

  test('repairs a partial save rather than refusing it', () => {
    const res = importSave(JSON.stringify({ name: 'Old', cls: 'warrior', level: 3, totalXP: 400 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // normalize() must have filled in everything the app reads.
    expect(res.state.stats).toBeDefined();
    expect(Array.isArray(res.state.questsDone)).toBe(true);
    expect(Array.isArray(res.state.inventory)).toBe(true);
    expect(res.state.weekly).toBeDefined();
    expect(res.state.milestones).toBeDefined();
  });

  test('warns but still loads a save from a newer version', () => {
    const env = { app: 'FORGE', format: SAVE_FORMAT + 5, exportedAt: '', state: played() };
    const res = importSave(JSON.stringify(env));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.warning).toBeTruthy();
  });

  test('rejects junk with a message a player can act on', () => {
    const cases = ['', '   ', 'hello', '{ broken', '[]', '{"app":"NOTFORGE"}', '{"name":"x"}'];
    cases.forEach(c => {
      const res = importSave(c);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.length).toBeGreaterThan(10);
        expect(res.error).toMatch(/[a-z]/); // prose, not an error code
      }
    });
  });

  test('rejects a save missing its level', () => {
    const res = importSave(JSON.stringify({ name: 'X', cls: 'warrior' }));
    expect(res.ok).toBe(false);
  });

  test('describeSave summarises a save for the confirm step', () => {
    const d = describeSave(played());
    expect(d).toContain('Kaito');
    expect(d).toContain('Level');
    expect(d).toContain('workouts');
  });

  test('importing does not alias the original object', () => {
    const before = played();
    const goldBefore = before.gold;
    const res = importSave(exportSave(before));
    if (!res.ok) throw new Error('expected ok');
    res.state.gold = 1;
    res.state.questsDone.push('tampered');
    expect(before.gold).toBe(goldBefore);
    expect(before.questsDone).not.toContain('tampered');
  });
});
