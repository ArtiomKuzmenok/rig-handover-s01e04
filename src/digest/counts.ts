import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Counts = { ok: number; retry: number; fail: number };

// Per-line status counts for a night. Bad lines are ignored. Null when the night can't be read.
export function countNight(runsDir: string, night: string): Counts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const l of text.split('\n')) {
    if (l.trim() === '') continue;
    let v: unknown;
    try {
      v = JSON.parse(l);
    } catch {
      continue;
    }
    if (typeof v !== 'object' || v === null) continue;
    const s = (v as Record<string, unknown>).status;
    if (s === 'ok' || s === 'retry' || s === 'fail') counts[s]++;
  }
  return counts;
}
