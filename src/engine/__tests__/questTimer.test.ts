import {
  ENGINE, defaultState, DAILY_POOL, normalize, dayReset,
  timedQuest, startQuestTimer, pauseQuestTimer, resumeQuestTimer, cancelQuestTimer,
  timerMinutes, timerDone, timerRemainingSec, timerRunning, formatClock,
  MIN_TIMED, MAX_TIMED,
} from '../index';

const T0 = 1_700_000_000_000; // fixed epoch; nothing here reads the real clock
const MIN = 60_000;

/** A timed workout quest and an untimed one, taken from the real pool. */
const timed = DAILY_POOL.find(q => timedQuest(q))!;
const untimed = DAILY_POOL.find(q => !timedQuest(q))!;

function fresh() {
  const s = defaultState('Hero', 'warrior');
  s.energy = 100;
  return s;
}

describe('which quests get a timer', () => {
  it('has both timed and untimed quests in the pool', () => {
    const t = DAILY_POOL.filter(timedQuest);
    expect(t.length).toBeGreaterThan(30);
    expect(t.length).toBeLessThan(DAILY_POOL.length);
  });

  it('never times a counter quest, whose min is a target not minutes', () => {
    // "Reach 8,000 steps" is min: 8000; "Log 2L of water" is min: 2 litres.
    // Treating either as minutes would be nonsense.
    for (const q of DAILY_POOL.filter(x => ['steps', 'water', 'nutrition', 'sleep', 'focus', 'mixed'].includes(x.type))) {
      expect(timedQuest(q)).toBe(false);
    }
  });

  it('never times a quest whose min is out of plausible session range', () => {
    // The 2,000m rower quest is type cardio with min: 2000 -- metres. Without
    // the upper bound that becomes a 33-hour countdown.
    for (const q of DAILY_POOL) {
      if (!timedQuest(q)) continue;
      expect(q.min).toBeGreaterThanOrEqual(MIN_TIMED);
      expect(q.min).toBeLessThanOrEqual(MAX_TIMED);
    }
    const rower = DAILY_POOL.find(q => q.min === 2000);
    expect(rower && timedQuest(rower)).toBe(false);
  });
});

describe('the clock is derived from timestamps', () => {
  it('counts minutes from wall-clock elapsed', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    expect(timerMinutes(s.questTimer!, T0)).toBe(0);
    expect(timerMinutes(s.questTimer!, T0 + 5 * MIN)).toBe(5);
    expect(timerMinutes(s.questTimer!, T0 + 5.9 * MIN)).toBe(5);
  });

  it('survives the app being closed: elapsed comes from now, not ticks', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    // Simulate a save/reload with no ticks in between.
    const reloaded = normalize(JSON.parse(JSON.stringify(s)));
    const later = T0 + timed.min * MIN;
    expect(timerDone(reloaded.questTimer!, later)).toBe(true);
  });

  it('does not credit paused time', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    pauseQuestTimer(s, T0 + 2 * MIN);       // 2 min banked
    expect(timerRunning(s.questTimer!)).toBe(false);
    // An hour passes while paused.
    expect(timerMinutes(s.questTimer!, T0 + 62 * MIN)).toBe(2);
    resumeQuestTimer(s, T0 + 62 * MIN);
    expect(timerRunning(s.questTimer!)).toBe(true);
    expect(timerMinutes(s.questTimer!, T0 + 65 * MIN)).toBe(5);
  });

  it('reports remaining seconds and formats a clock', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    expect(timerRemainingSec(s.questTimer!, T0)).toBe(timed.min * 60);
    expect(formatClock(timed.min * 60)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('clamps remaining at zero rather than going negative', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    expect(timerRemainingSec(s.questTimer!, T0 + 999 * MIN)).toBe(0);
  });
});

describe('starting and stopping', () => {
  it('refuses a second timer while one runs', () => {
    const s = fresh();
    expect(startQuestTimer(s, timed.id, T0).ok).toBe(true);
    const other = DAILY_POOL.find(q => timedQuest(q) && q.id !== timed.id)!;
    const r = startQuestTimer(s, other.id, T0 + MIN);
    expect(r.ok).toBe(false);
    expect(s.questTimer!.questId).toBe(timed.id);
  });

  it('refuses to time an untimed quest', () => {
    const s = fresh();
    expect(startQuestTimer(s, untimed.id, T0).ok).toBe(false);
    expect(s.questTimer).toBeNull();
  });

  it('refuses a quest already completed today', () => {
    const s = fresh();
    s.questsDone.push(timed.id);
    expect(startQuestTimer(s, timed.id, T0).ok).toBe(false);
  });

  it('cancel drops the timer with no credit', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    cancelQuestTimer(s);
    expect(s.questTimer).toBeNull();
    expect(s.questsDone).not.toContain(timed.id);
  });
});

describe('completion is gated on the timer', () => {
  it('rejects a timed quest with no timer at all', () => {
    const s = fresh();
    expect(ENGINE.completeQuest(s, timed.id, T0)).toBe(false);
    expect(s.questsDone).not.toContain(timed.id);
  });

  it('rejects a timed quest whose clock has not finished', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    const oneShort = T0 + (timed.min - 1) * MIN;
    expect(ENGINE.completeQuest(s, timed.id, oneShort)).toBe(false);
    expect(s.questsDone).not.toContain(timed.id);
  });

  it('accepts once the clock is met, and consumes the timer', () => {
    const s = fresh();
    const xp0 = s.totalXP;
    startQuestTimer(s, timed.id, T0);
    expect(ENGINE.completeQuest(s, timed.id, T0 + timed.min * MIN)).toBe(true);
    expect(s.questsDone).toContain(timed.id);
    expect(s.totalXP).toBeGreaterThan(xp0);
    expect(s.questTimer).toBeNull(); // slot freed for the next quest
  });

  it("will not let one finished timer pay out a different quest", () => {
    const s = fresh();
    const other = DAILY_POOL.find(q => timedQuest(q) && q.id !== timed.id)!;
    startQuestTimer(s, timed.id, T0);
    const done = T0 + Math.max(timed.min, other.min) * MIN;
    expect(ENGINE.completeQuest(s, other.id, done)).toBe(false);
  });

  it('leaves untimed quests instantly completable', () => {
    const s = fresh();
    expect(ENGINE.completeQuest(s, untimed.id, T0)).toBe(true);
    expect(s.questsDone).toContain(untimed.id);
  });

  it('still refuses a completed quest twice', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    const done = T0 + timed.min * MIN;
    expect(ENGINE.completeQuest(s, timed.id, done)).toBe(true);
    expect(ENGINE.completeQuest(s, timed.id, done)).toBe(false);
  });
});

describe('persistence and hygiene', () => {
  it('a running timer survives a save round-trip', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    const back = normalize(JSON.parse(JSON.stringify(s)));
    expect(back.questTimer).not.toBeNull();
    expect(back.questTimer!.questId).toBe(timed.id);
    expect(back.questTimer!.started).toBe(T0);
  });

  it('normalize discards a malformed timer from a hand-edited save', () => {
    // Save export/import is plain text, so players can and will edit it.
    for (const junk of [{}, { questId: 5 }, { questId: 'x', started: 'soon' }, 'nope', 7]) {
      const s = fresh();
      (s as unknown as { questTimer: unknown }).questTimer = junk;
      expect(normalize(JSON.parse(JSON.stringify(s))).questTimer).toBeNull();
    }
  });

  it('an old save with no timer field normalizes to null', () => {
    const s = fresh();
    delete (s as unknown as { questTimer?: unknown }).questTimer;
    expect(normalize(JSON.parse(JSON.stringify(s))).questTimer).toBeNull();
  });

  it('the day rollover clears a timer left running overnight', () => {
    const s = fresh();
    startQuestTimer(s, timed.id, T0);
    s.lastDay = '1999-01-01';
    dayReset(s);
    expect(s.questTimer).toBeNull();
  });
});
