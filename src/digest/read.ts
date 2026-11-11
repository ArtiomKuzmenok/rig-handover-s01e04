import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunStatus } from './types.js';

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

const STATUSES = new Set(['ok', 'retry', 'fail']);

// Parse at the edge: a line is valid only if it has the fields the digest needs.
function parseLine(text: string): Line | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || typeof o.status !== 'string') return null;
  if (!STATUSES.has(o.status)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as RunStatus,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const byJob = new Map<string, Line[]>();
  let badLines = 0;
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    const line = parseLine(text);
    if (!line) {
      badLines++;
      continue;
    }
    byJob.set(line.job, [...(byJob.get(line.job) ?? []), line]);
  }

  const rows: DigestRow[] = [...byJob.entries()]
    .map(([job, lines]) => {
      // Order by time of day as logged; ISO strings with the same offset sort as text.
      const sorted = [...lines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const last = sorted[sorted.length - 1]!;
      const lastWithError = [...sorted].reverse().find((l) => l.error !== null);
      return {
        job,
        owner: last.owner ?? sorted.find((l) => l.owner !== null)?.owner ?? null,
        runs: lines.length,
        retries: lines.filter((l) => l.status === 'retry').length,
        lastStatus: last.status,
        lastError: lastWithError?.error ?? null,
        first: sorted[0]!.at,
        last: last.at,
      };
    })
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  const result: Night = { night, rows, badLines };
  return result;
};
