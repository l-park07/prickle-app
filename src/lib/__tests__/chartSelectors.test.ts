import { getEventDays, resolveGranularity, type ResolvedGranularity } from '../chartSelectors';
import type { CustomChartConfig } from '../manageCustomCharts';
import { createTestDb } from '../testSupport/testDb';

describe('resolveGranularity', () => {
  const ranges: CustomChartConfig['range'][] = ['30d', '90d', '6mo', '1yr', 'all'];
  const requests: CustomChartConfig['granularity'][] = ['auto', 'daily', 'weekly', 'monthly'];

  const autoExpectation: Record<CustomChartConfig['range'], ResolvedGranularity['granularity']> = {
    '30d': 'daily',
    '90d': 'daily',
    '6mo': 'weekly',
    '1yr': 'monthly',
    all: 'monthly',
  };

  describe('hasEventSeries: true — always forced to daily', () => {
    test.each(ranges.flatMap((range) => requests.map((requested) => [range, requested] as const)))(
      'range=%s requested=%s',
      (range, requested) => {
        expect(resolveGranularity(range, requested, true)).toEqual({ granularity: 'daily', forced: true });
      }
    );
  });

  describe('hasEventSeries: false', () => {
    test.each(ranges.flatMap((range) => requests.map((requested) => [range, requested] as const)))(
      'range=%s requested=%s',
      (range, requested) => {
        const expected = requested === 'auto' ? autoExpectation[range] : requested;
        expect(resolveGranularity(range, requested, false)).toEqual({ granularity: expected, forced: false });
      }
    );
  });
});

describe('getEventDays', () => {
  const userId = 'user1';
  const from = '2024-01-01';
  const to = '2024-01-04';

  async function seed() {
    const db = createTestDb();
    const ts = '2024-01-01T00:00:00.000Z';

    await db.runAsync(
      `INSERT INTO triggers (id, user_id, name, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ['trig1', userId, 'Heat', 'outdoor', ts, ts]
    );

    // 01: logged, trigger checked (live) -> should appear
    await db.runAsync(
      `INSERT INTO daily_logs (id, user_id, log_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ['log1', userId, '2024-01-01', ts, ts]
    );
    await db.runAsync(`INSERT INTO log_triggers (id, log_id, trigger_id, created_at) VALUES (?, ?, ?, ?)`, [
      'lt1',
      'log1',
      'trig1',
      ts,
    ]);

    // 02: logged, trigger NOT checked -> should not appear
    await db.runAsync(
      `INSERT INTO daily_logs (id, user_id, log_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ['log2', userId, '2024-01-02', ts, ts]
    );

    // 03: not logged at all (no daily_logs row) -> should not appear

    // 04: logged, trigger checked but the log_triggers row is soft-deleted -> should not appear
    await db.runAsync(
      `INSERT INTO daily_logs (id, user_id, log_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ['log4', userId, '2024-01-04', ts, ts]
    );
    await db.runAsync(
      `INSERT INTO log_triggers (id, log_id, trigger_id, created_at, deleted_at) VALUES (?, ?, ?, ?, ?)`,
      ['lt4', 'log4', 'trig1', ts, ts]
    );

    return db;
  }

  test('returns only the day with a live, logged trigger', async () => {
    const db = await seed();
    const days = await getEventDays(db, userId, 'trigger', 'trig1', from, to);
    expect(days).toEqual(['2024-01-01']);
  });
});
