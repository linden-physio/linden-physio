import { CalendarX } from "lucide-react";
import { dayName } from "./dayName";
import { TimeChip } from "./TimeChip";

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
      <div
        id="count"
        className="flex h-12 items-center gap-3 overflow-hidden rounded-md bg-muted-100 px-4 whitespace-nowrap"
      >
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
      <fieldset id="free-times" className="mt-3 flex flex-wrap gap-2">
        <legend className="sr-only">Pick a time</legend>
        {times.map((time) => (
          <TimeChip key={time} time={time} picked={time === picked} onPick={() => onPick(time)} />
        ))}
      </fieldset>
    </>
  );
}
