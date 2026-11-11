export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log: keep the row, show "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null;
  first: string; // earliest `at`
  last: string; // latest `at`
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted not thrown
};

// Reads <runsDir>/<night>.jsonl. Returns null when the file does not exist (route: 404).
// An empty file returns { rows: [], badLines: 0 }. Never throws on a bad line.
export type ReadNight = (runsDir: string, night: string) => Night | null;
