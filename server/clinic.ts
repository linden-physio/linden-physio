import pg from "pg";
import { and, eq, gt, gte, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { bookings, openingHours, services, staff } from "./schema.ts";
import type { FreeTimes, NewBooking } from "./schemas.ts";
import { toInstant, fromInstant } from "./clock.ts";
import { freeTimes, nearestFreeTime, type Booking, type OpeningHours } from "./slots.ts";
import { db } from "./db.ts";

function addMinutes(time: string, minutes: number): string {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The clinic's wall clock, as Postgres writes it.
const wall = (column: AnyPgColumn, format: string) =>
  sql<string>`to_char(${column} AT TIME ZONE 'Europe/Stockholm', ${format})`;

// "Karin" from "Karin Holm".
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// Postgres's own error, under the one drizzle wraps it in.
function postgresError(error: unknown): pg.DatabaseError | null {
  const cause = error instanceof Error ? error.cause : null;
  return cause instanceof pg.DatabaseError ? cause : null;
}

// The earliest of some { date, time } answers, or null if there are none.
function earliest(answers: ({ date: string; time: string } | null)[]) {
  const found = answers.filter((a) => a !== null).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return found[0] ?? null;
}

// with is the first name of the physiotherapist the booking is with.
export type Booked =
  { kind: "booked"; id: string; startsAt: string; with: string } | { kind: "taken" } | { kind: "no-service" };
export type Cancelled = "cancelled" | "started" | "missing";

// What the clinic can do, with the given database. now() is the time; the tests give it a fixed one.
// The pages and the server actions call these functions directly; the routes in routes.ts answer
// HTTP requests with them.
export function makeClinic(db: NodePgDatabase, now: () => Date = () => new Date()) {
  // The clinic's opening hours, by weekday (0 is Sunday). A day with no row is closed.
  async function hoursByWeekday(): Promise<Record<number, OpeningHours>> {
    const hours: Record<number, OpeningHours> = {};
    for (let weekday = 0; weekday < 7; weekday++) hours[weekday] = "closed";
    for (const row of await db.select().from(openingHours)) {
      hours[row.weekday] = { open: row.opens.slice(0, 5), close: row.closes.slice(0, 5) };
    }
    return hours;
  }

  // How long a service takes, or null if there's no such service.
  async function minutesFor(service: string): Promise<number | null> {
    const [row] = await db.select().from(services).where(eq(services.id, service));
    return row ? row.minutes : null;
  }

  // Everything needed to work out a day's free times: the hours, the staff, and each one's bookings.
  async function diary(date: string) {
    // By id, so a time's names always come in the same order, and booking tries people in that order.
    const [hours, people, booked] = await Promise.all([
      hoursByWeekday(),
      db.select().from(staff).orderBy(staff.id),
      bookingsFrom(date),
    ]);
    return {
      hours,
      people: people.map((person) => ({ ...person, bookings: booked.filter((b) => b.staffId === person.id) })),
    };
  }

  // The bookings from the given day to two weeks after it, in the clinic's wall time.
  async function bookingsFrom(date: string): Promise<(Booking & { staffId: number })[]> {
    return db
      .select({
        staffId: bookings.staffId,
        date: wall(bookings.startsAt, "YYYY-MM-DD"),
        start: wall(bookings.startsAt, "HH24:MI"),
        end: wall(bookings.endsAt, "HH24:MI"),
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, toInstant(date, "00:00")),
          lt(bookings.startsAt, toInstant(addDays(date, 15), "00:00")),
        ),
      );
  }

  // A day's free times for a service, or null if there's no such service.
  async function freeTimesOn(date: string, service: string): Promise<FreeTimes | null> {
    const length = await minutesFor(service);
    if (length === null) return null;
    const { hours, people } = await diary(date);
    // A time is free if any physiotherapist is free then. Each time carries the first names of the
    // ones who are, so someone coming back can see whom they'd see.
    const free = new Map<string, string[]>();
    for (const person of people) {
      for (const time of freeTimes(date, length, hours, person.bookings)) {
        free.set(time, [...(free.get(time) ?? []), firstName(person.name)]);
      }
    }
    const times = [...free.keys()].sort();
    const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
    const nearest = closed
      ? earliest(people.map((person) => nearestFreeTime(date, length, hours, person.bookings)))
      : null;
    return {
      closed,
      times: times.map((time) => ({ startsAt: toInstant(date, time), with: free.get(time) ?? [] })),
      nearest: nearest && { date: nearest.date, startsAt: toInstant(nearest.date, nearest.time) },
    };
  }

  async function book(booking: NewBooking): Promise<Booked> {
    const { date, time } = fromInstant(booking.start);
    const length = await minutesFor(booking.service);
    if (length === null) return { kind: "no-service" };
    // Try the physiotherapists who are free at that time, one after another. Another request can
    // take the same physiotherapist between our check and our insert, and then the next one may
    // still be free.
    const { hours, people } = await diary(date);
    const free = people.filter((person) => freeTimes(date, length, hours, person.bookings).includes(time));
    for (const person of free) {
      try {
        const [made] = await db
          .insert(bookings)
          .values({
            startsAt: toInstant(date, time),
            endsAt: toInstant(date, addMinutes(time, length)),
            service: booking.service,
            staffId: person.id,
            name: booking.name,
            email: booking.email,
          })
          .returning({ id: bookings.publicId });
        // The id is what the person who booked cancels with.
        return { kind: "booked", id: made.id, startsAt: toInstant(date, time), with: firstName(person.name) };
      } catch (error) {
        // The table's rule refused it: 23P01 (exclusion constraint), or now and then 40P01, when two
        // inserts were waiting for each other and Postgres stopped one of them.
        const code = postgresError(error)?.code;
        if (code !== "23P01" && code !== "40P01") throw error;
      }
    }
    return { kind: "taken" };
  }

  async function cancel(id: string): Promise<Cancelled> {
    // Delete it only if it hasn't started, in one statement, so that nothing can change in between.
    const deleted = await db
      .delete(bookings)
      .where(and(eq(bookings.publicId, id), gt(bookings.startsAt, now().toISOString())))
      .returning({ id: bookings.id });
    if (deleted.length > 0) return "cancelled";
    // Nothing deleted: either there's no such booking, or it has already started.
    const [left] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.publicId, id));
    return left ? "started" : "missing";
  }

  return { freeTimesOn, book, cancel };
}

// The clinic, with the database from the environment.
export const clinic = () => makeClinic(db());
