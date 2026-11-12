import { clockTime } from "./clockTime";
import { dayName } from "./dayName";
import type { FreeTimes } from "./api";

// "Next free: Tuesday 10:00", once the clinic's server has answered with the free times.
export async function NextFree({ date, free }: { date: string; free: Promise<FreeTimes | null> }) {
  const answer = await free;
  if (!answer) return null;
  const first = answer.times[0];
  const next = first ? { date, startsAt: first.startsAt } : answer.nearest;
  if (!next) return null;
  return (
    <p className="rounded-full bg-brand-50 px-4 py-2 text-brand-700">
      Next free: {dayName(next.date) + " " + clockTime(next.startsAt)}
    </p>
  );
}
