import { eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { bookings, openingHours, services, staff } from "./schema.ts";
import { toInstant } from "./clock.ts";
import { setting } from "./env.ts";

// The businesses as they are today: their services, opening hours and staff. (The businesses
// themselves are made by a migration.) Running it again changes nothing.
export async function seed(db: NodePgDatabase) {
  await db
    .insert(services)
    .values([
      { id: "first-visit", businessId: "linden", title: "First visit", minutes: 60, priceSek: 950 },
      { id: "follow-up", businessId: "linden", title: "Follow-up", minutes: 30, priceSek: 650 },
      { id: "sports-massage", businessId: "linden", title: "Sports massage", minutes: 45, priceSek: 750 },
      { id: "cut", businessId: "birch", title: "Cut", minutes: 45, priceSek: 690 },
      { id: "cut-and-colour", businessId: "birch", title: "Cut and colour", minutes: 120, priceSek: 1850 },
    ])
    .onConflictDoNothing();
  await db
    .insert(openingHours)
    .values([
      { businessId: "linden", weekday: 1, opens: "09:00", closes: "12:00" },
      { businessId: "linden", weekday: 2, opens: "09:00", closes: "12:00" },
      { businessId: "linden", weekday: 3, opens: "09:00", closes: "12:00" },
      { businessId: "linden", weekday: 4, opens: "13:00", closes: "17:00" },
      { businessId: "linden", weekday: 5, opens: "09:00", closes: "12:00" },
      { businessId: "birch", weekday: 2, opens: "10:00", closes: "18:00" },
      { businessId: "birch", weekday: 3, opens: "10:00", closes: "18:00" },
      { businessId: "birch", weekday: 4, opens: "10:00", closes: "18:00" },
      { businessId: "birch", weekday: 5, opens: "10:00", closes: "18:00" },
      { businessId: "birch", weekday: 6, opens: "10:00", closes: "15:00" },
    ])
    .onConflictDoNothing();
  await db
    .insert(staff)
    .values([
      { id: 1, businessId: "linden", name: "Karin Holm", email: "karin@lindenphysio.com", role: "owner" },
      { id: 2, businessId: "linden", name: "Oskar Nyberg", email: "oskar@lindenphysio.com", role: "physio" },
      { id: 3, businessId: "birch", name: "Alva Dahl", email: "alva@thebirchhairstudio.com", role: "owner" },
    ])
    .onConflictDoNothing();
  // The ids above were given by hand, so move the counter past them for staff added later.
  await db.execute(sql`SELECT setval('staff_id_seq', (SELECT max(id) FROM staff))`);
  // Rows from before staff had addresses.
  await db.update(staff).set({ email: "karin@lindenphysio.com", role: "owner" }).where(eq(staff.id, 1));
  await db.update(staff).set({ email: "oskar@lindenphysio.com" }).where(eq(staff.id, 2));
}

// A week of bookings to work with on this computer. Running it again changes nothing.
export async function seedWeek(db: NodePgDatabase) {
  // The week of Monday 9 November 2026: [day, time, minutes, service, staff, name].
  const week: [string, string, number, string, number, string][] = [
    ["2026-11-09", "09:00", 60, "first-visit", 1, "Ola Berg"],
    ["2026-11-09", "10:30", 30, "follow-up", 2, "Sara Lund"],
    ["2026-11-10", "09:00", 60, "first-visit", 1, "Erik Sjö"],
    ["2026-11-10", "10:00", 60, "first-visit", 1, "Phone booking"],
    ["2026-11-11", "11:00", 60, "first-visit", 1, "Lina Ek"],
    ["2026-11-11", "09:00", 45, "sports-massage", 2, "Johan Ahl"],
    ["2026-11-12", "14:00", 30, "follow-up", 1, "Maria Dahl"],
    ["2026-11-13", "09:30", 60, "first-visit", 2, "Nils Ström"],
    // At Birch Hair Studio, with Alva.
    ["2026-11-10", "10:00", 45, "cut", 3, "Ida Wik"],
    ["2026-11-10", "13:00", 120, "cut-and-colour", 3, "Tove Ahl"],
  ];
  // DO NOTHING without a target also skips a row that breaks the no-overlap rule: one that's already there.
  await db
    .insert(bookings)
    .values(
      week.map(([date, time, minutes, service, staffId, name]) => ({
        businessId: staffId === 3 ? "birch" : "linden",
        startsAt: toInstant(date, time),
        endsAt: new Date(Date.parse(toInstant(date, time)) + minutes * 60_000).toISOString(),
        service,
        staffId,
        name,
        email: name.toLowerCase().replace(" ", ".") + "@example.com",
      })),
    )
    .onConflictDoNothing();
}

// `npm run seed` fills the database named in DATABASE_URL.
if (import.meta.main) {
  const db = drizzle(setting("DATABASE_URL"));
  await seed(db);
  await seedWeek(db);
  await db.$client.end();
  console.log("Seeded the clinic's services, opening hours, staff and a week of bookings.");
}
