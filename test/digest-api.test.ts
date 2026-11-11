import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON, rows in job order', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
    expect(typeof body.badLines).toBe('number');
  });

  it('404s on an unknown night', async () => {
    const res = await createApp(config).request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });
});
