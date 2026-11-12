"use client";

import { CalendarX } from "lucide-react";
import { dayName } from "./dayName";
import { TimeChip } from "./TimeChip";
import { clockTime } from "./clockTime";
import type { FreeTimes } from "../server/schemas.ts";
import { usePicked } from "./Booking";

export function TimeList({
  date,
  times,
  closed,
  nearest,
}: {
  date: string;
  times: FreeTimes["times"];
  closed: boolean;
  nearest: FreeTimes["nearest"];
}) {
  const { picked, pick } = usePicked();
  return (
    <>
      {/* A status is read out politely whenever its text changes, for example when the day changes. */}
      <div role="status">
        {closed ? (
          <div id="count" className="flex items-center gap-3 overflow-hidden rounded-md bg-muted-100 px-4 py-3">
            <CalendarX className="size-5 shrink-0 text-ink-600" />
            <span>
              We're closed on {dayName(date)}s.
              {nearest &&
                " The nearest free time is " + dayName(nearest.date) + " " + clockTime(nearest.startsAt) + "."}
            </span>
          </div>
        ) : (
          <p id="count" className="text-ink-600">
            {times.length === 0 ? "No free times on " + dayName(date) : times.length + " free times"}
          </p>
        )}
      </div>
      {!closed && (
        <fieldset id="free-times" className="mt-3 flex flex-wrap gap-2">
          <legend className="sr-only">Pick a time</legend>
          {times.map(({ startsAt }) => (
            <TimeChip key={startsAt} time={startsAt} picked={startsAt === picked} onPick={() => pick(startsAt)} />
          ))}
        </fieldset>
      )}
    </>
  );
}
