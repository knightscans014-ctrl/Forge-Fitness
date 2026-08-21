import { DAILY_POOL, WEEKLY_QUESTS, STORY_MISSIONS } from '../index';

/**
 * Every objective must say two things: a flavour name (what the game calls it)
 * and a plain-language line naming the actual exercise or target. A player who
 * has never read a fitness app should be able to tell what to do from the
 * second line alone.
 */
describe('objectives name the real exercise, not just a flavour title', () => {
  test('every daily quest has both a title and a distinct description', () => {
    for (const q of DAILY_POOL) {
      expect(q.title.trim().length).toBeGreaterThan(0);
      expect(q.desc.trim().length).toBeGreaterThan(0);
      // the plain line must add information, not echo the flavour name
      expect(q.desc.trim().toLowerCase()).not.toBe(q.title.trim().toLowerCase());
    }
  });

  test('every weekly quest has both a title and a distinct description', () => {
    for (const w of WEEKLY_QUESTS) {
      expect(w.title.trim().length).toBeGreaterThan(0);
      expect(w.desc.trim().length).toBeGreaterThan(0);
      expect(w.desc.trim().toLowerCase()).not.toBe(w.title.trim().toLowerCase());
    }
  });

  test('every story step carries a plain requirement line', () => {
    for (const arc of STORY_MISSIONS) {
      for (const st of arc.steps) {
        expect(st.name.trim().length).toBeGreaterThan(0);
        expect(st.req.trim().length).toBeGreaterThan(0);
        expect(st.req.trim().toLowerCase()).not.toBe(st.name.trim().toLowerCase());
      }
    }
  });

  test('story requirements start with a concrete verb or target', () => {
    const VERB = /^(log|reach|defeat|collect|earn|hold|complete|train)\b/i;
    for (const arc of STORY_MISSIONS) {
      for (const st of arc.steps) {
        expect({ step: `${arc.id}/${st.name}`, req: st.req }).toEqual({
          step: `${arc.id}/${st.name}`,
          req: expect.stringMatching(VERB),
        });
      }
    }
  });

  test('a workout quest description states a measurable target', () => {
    // timed/counted quests must give a number the player can act on
    const NUMERIC = /\d/;
    const workoutish = DAILY_POOL.filter(q =>
      ['strength', 'cardio', 'flex'].includes(q.type),
    );
    expect(workoutish.length).toBeGreaterThan(0);
    for (const q of workoutish) {
      expect(`${q.id}: ${q.desc}`).toMatch(new RegExp(`: .*${NUMERIC.source}`));
    }
  });
});
