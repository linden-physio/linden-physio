import { clock } from "./time.js";

// The day's free times. A server component that waits for the clinic's answer.
export async function Times({ free }) {
  const { times } = await free;
  if (times.length === 0) return <p className="muted">No free times this day.</p>;
  return (
    <ul className="times">
      {times.map(({ startsAt }) => (
        <li key={startsAt} className="chip">
          {clock(startsAt)}
        </li>
      ))}
    </ul>
  );
}
