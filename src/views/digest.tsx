import type { Night } from '../digest/index.js';

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((r) => {
              const manyRetries = r.retries >= 3;
              const failed = r.lastStatus === 'fail';
              return (
                <tr class={manyRetries || failed ? 'warn' : undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? '—'}</td>
                  <td>{r.runs}</td>
                  <td>
                    {r.retries}
                    {manyRetries ? ' ⚠ retries' : ''}
                  </td>
                  <td>
                    {r.lastStatus}
                    {failed ? ' ✗ fail' : ''}
                  </td>
                  <td>{r.lastError ?? '—'}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {night.badLines > 0 ? <p class="mute">{night.badLines} unparseable line(s) skipped</p> : null}
    </>
  );
}
