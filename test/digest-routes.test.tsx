import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (at: string, job: string, status = 'ok') => JSON.stringify({ at, job, status, owner: 'rook' });

// Jobs are written out of order on purpose: the routes must sort by job.
const JOBS_SORTED = ['alpha/one', 'mid/two', 'zeta/three'];

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  const normal = [
    line('2026-01-01T23:00:00+01:00', 'zeta/three'),
    line('2026-01-01T23:05:00+01:00', 'alpha/one'),
    line('2026-01-01T23:10:00+01:00', 'mid/two'),
  ];
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), normal.join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-01-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-01-03.jsonl'), [normal[0], 'this is not json {', normal[1]].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

const jobOrderInHtml = (html: string) =>
  JOBS_SORTED.map((j) => ({ j, i: html.indexOf(j) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.j);

describe('GET /digest/:night', () => {
  it('renders a table of jobs sorted by job on a normal night', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<table');
    expect(jobOrderInHtml(html)).toEqual(JOBS_SORTED);
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders when a line is bad', async () => {
    const res = await app.request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('alpha/one');
    expect(html).toContain('zeta/three');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns night, rows sorted by job and badLines on a normal night', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-01-01');
    expect(body.rows.map((r) => r.job)).toEqual(JOBS_SORTED);
    expect(body.badLines).toBe(0);
  });

  it('404s with a JSON error for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('counts bad lines and keeps the good rows', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha/one', 'zeta/three']);
  });
});

describe('page and JSON agree (ADR 0001)', () => {
  it('lists jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-01-01')).text();
    const body = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[] };
    expect(jobOrderInHtml(html)).toEqual(body.rows.map((r) => r.job));
  });
});
