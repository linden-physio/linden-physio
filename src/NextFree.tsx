import { useFreeTimes } from "./useFreeTimes";
import { clockTime } from "./clockTime";
import { dayName } from "./dayName";

// "Next free: Tuesday 10:00", for the day and service on screen. It asks the same question as the
// list of free times, so the cache answers both with one request.
export function NextFree({ date, serviceId }: { date: string; serviceId: string }) {
  const free = useFreeTimes(date, serviceId);
  if (!free.isSuccess) return null;
  const first = free.data.times[0];
  const next = first ? { date, startsAt: first.startsAt } : free.data.nearest;
  if (!next) return null;
  return (
    <p className="rounded-full bg-brand-50 px-4 py-2 text-brand-700">
      Next free: {dayName(next.date) + " " + clockTime(next.startsAt)}
    </p>
  );
}
