import { Suspense } from "react";
import type { Metadata } from "next";
import { z } from "zod";
import { clinic } from "../../../server/clinic.ts";
import { fromInstant } from "../../../server/clock.ts";
import { DayView } from "../../staff/DayView";
import { staffOnly } from "../../session";

export const metadata: Metadata = { title: "Day · Linden Physio" };

// The day in the address, like /staff?day=2026-11-10, or today on the clinic's clock.
const Choice = z.object({ day: z.iso.date().optional() });

// The staff's day: every booking, who it's for and what it's worth. Made for each visit, on the server.
export default function StaffDay({ searchParams }: PageProps<"/staff">) {
  return (
    <Suspense fallback={<p className="text-ink-600">Loading the day…</p>}>
      <Day searchParams={searchParams} />
    </Suspense>
  );
}

async function Day({ searchParams }: Pick<PageProps<"/staff">, "searchParams">) {
  // The proxy only saw that there's a cookie. Check that it belongs to someone before reading the day.
  await staffOnly();
  const parsed = Choice.safeParse(await searchParams);
  const date = (parsed.success && parsed.data.day) || fromInstant(new Date().toISOString()).date;
  return <DayView date={date} day={await clinic().day(date)} />;
}
