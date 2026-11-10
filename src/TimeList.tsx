import { CalendarX } from "lucide-react";
import { dayName } from "./dayName";

export function TimeList({
  date,
  times,
  closed,
  nearest,
  picked,
  onPick,
}: {
  date: string;
  times: string[];
  closed: boolean;
  nearest: { date: string; time: string } | null;
  picked: string | null;
  onPick: (time: string) => void;
}) {
  if (closed) {
    return (
      <div id="count" className="flex h-12 items-center gap-3 overflow-hidden rounded-md bg-muted-100 px-4 whitespace-nowrap">
        <CalendarX className="size-5 shrink-0 text-ink-600" />
        <span>
          We're closed on {dayName(date)}s.
          {nearest && " The nearest free time is " + dayName(nearest.date) + " " + nearest.time + "."}
        </span>
      </div>
    );
  }
  return (
    <>
      <p id="count" className="text-ink-600">
        {times.length === 0 ? "No free times on " + dayName(date) : times.length + " free times"}
      </p>
      <div id="free-times" className="mt-3 flex gap-2">
        {times.map((time) => (
          <div
            key={time}
            className={
              "flex h-10 cursor-pointer items-center rounded-full border px-4 " +
              (time === picked ? "border-brand-600 bg-brand-600 text-white" : "border-line-200 bg-surface")
            }
            onClick={() => onPick(time)}
          >
            {time}
          </div>
        ))}
      </div>
    </>
  );
}
