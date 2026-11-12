import { dayName } from "./time.js";

// A link for each day. A server component: plain links, made on the server.
const days = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];

export function DayLinks({ day, service }) {
  return (
    <nav className="days">
      {days.map((d) => (
        <a key={d} href={`/?day=${d}&service=${service}`} aria-current={d === day ? "page" : undefined}>
          {dayName(d).slice(0, 3)} {Number(d.slice(8))}
        </a>
      ))}
    </nav>
  );
}
