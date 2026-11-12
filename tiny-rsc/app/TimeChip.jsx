"use client";

import { usePicked } from "./Booking.jsx";
import { clock } from "./time.js";

// One free time. It lights up when it's the one picked.
export function TimeChip({ startsAt }) {
  const { picked, pick } = usePicked();
  return (
    <button className="chip" aria-pressed={picked === startsAt} onClick={() => pick(startsAt)}>
      {clock(startsAt)}
    </button>
  );
}
