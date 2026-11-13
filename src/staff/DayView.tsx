import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Day } from "../../server/clinic.ts";
import { cancelVisit } from "../staffActions";
import type { Staff } from "../session";

// The day runs from 08:00 to 18:00 on the page, and each hour is this tall.
const first = 8;
const last = 18;
const hourHeight = 4.5; // rem

function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

// How far down the day a time is, in rem.
function top(time: string): number {
  return ((minutes(time) - first * 60) / 60) * hourHeight;
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const kronor = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });

// A day at the clinic, as the staff see it: a column for each physiotherapist, each booking at its time.
// The owner sees what the day is worth and can cancel any booking; a physio, only their own.
export function DayView({ date, day, who }: { date: string; day: Day; who: Staff }) {
  const owner = who.role === "owner";
  const visits = day.people.flatMap((person) => person.visits);
  const value = visits.reduce((sum, visit) => sum + visit.priceSek, 0);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => String(first + i).padStart(2, "0") + ":00");
  const arrow = buttonVariants({ variant: "ghost", size: "icon" });
  const title = new Date(date + "T12:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href={"/staff?day=" + addDays(date, -1)} aria-label="Previous day" className={arrow}>
            <ChevronLeft />
          </Link>
          <Link href={"/staff?day=" + addDays(date, 1)} aria-label="Next day" className={arrow}>
            <ChevronRight />
          </Link>
          <h1 className="text-title">{title}</h1>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-small text-ink-600">Booked</dt>
            <dd className="text-title">{visits.length}</dd>
          </div>
          {owner && (
            <div>
              <dt className="text-small text-ink-600">Value</dt>
              <dd className="text-title">{kronor.format(value)}</dd>
            </div>
          )}
        </dl>
      </header>
      <div className="overflow-x-auto rounded-md border border-line-200">
        <div className="grid min-w-xl" style={{ gridTemplateColumns: `4rem repeat(${day.people.length}, 1fr)` }}>
          <div className="border-b border-line-200" />
          {day.people.map((person) => (
            <h2 key={person.id} className="border-b border-l border-line-200 px-3 py-2 font-semibold">
              {person.name}
            </h2>
          ))}
          <div className="relative" style={{ height: (last - first) * hourHeight + "rem" }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-small text-ink-600"
                style={{ top: top(hour) + "rem" }}
              >
                {hour}
              </span>
            ))}
          </div>
          {day.people.map((person) => (
            <div key={person.id} className="relative border-l border-line-200">
              {day.hours === "closed" ? (
                <Closed from="08:00" to="18:00" />
              ) : (
                <>
                  <Closed from="08:00" to={day.hours.open} />
                  <Closed from={day.hours.close} to="18:00" />
                </>
              )}
              <ul aria-label={person.name + "'s bookings"}>
                {person.visits.map((visit) => (
                  <li
                    key={visit.id}
                    className="absolute inset-x-1 overflow-hidden rounded-sm border border-brand-600/40 bg-brand-50 px-2 py-1 text-small"
                    style={{ top: top(visit.start) + "rem", height: top(visit.end) - top(visit.start) + "rem" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium">{visit.start}</span> {visit.name}
                        <span className="block text-ink-600">{visit.service}</span>
                      </div>
                      {(owner || person.id === who.id) && (
                        <form action={cancelVisit}>
                          <input type="hidden" name="id" value={visit.id} />
                          <button
                            type="submit"
                            className="text-brand-700 underline"
                            aria-label={"Cancel " + visit.name + "'s booking at " + visit.start}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hours the clinic is closed, shaded.
function Closed({ from, to }: { from: string; to: string }) {
  if (minutes(to) <= minutes(from)) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,var(--color-muted-100)_0_6px,transparent_6px_12px)]"
      style={{ top: top(from) + "rem", height: top(to) - top(from) + "rem" }}
    />
  );
}
