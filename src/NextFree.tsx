import { clockTime } from "./clockTime";
import { dayName } from "./dayName";
import type { FreeTimes } from "./api";

// "Next free: Tuesday 10:00", from the free times the server already has for the page.
export function NextFree({ date, free }: { date: string; free: FreeTimes }) {
  const first = free.times[0];
  const next = first ? { date, startsAt: first.startsAt } : free.nearest;
  if (!next) return null;
  return (
    <p className="rounded-full bg-brand-50 px-4 py-2 text-brand-700">
      Next free: {dayName(next.date) + " " + clockTime(next.startsAt)}
    </p>
  );
}
