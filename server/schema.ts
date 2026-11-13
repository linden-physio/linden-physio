import { pgTable, serial, timestamp, text, integer, time, index, uuid, primaryKey } from "drizzle-orm/pg-core";

// The app's tables, described in TypeScript. drizzle-kit compares this file with the migrations
// so far and writes the SQL for what changed.

// The businesses that take bookings here: Linden Physio, and Birch Hair Studio. Every other row says
// which business it belongs to.
export const businesses = pgTable("businesses", {
  id: text().primaryKey(), // like "linden"
  name: text().notNull(),
  email: text().notNull(),
  // The addresses its pages are at, like "lindenphysio.com".
  hosts: text().array().notNull(),
});

const businessId = () =>
  text("business_id")
    .notNull()
    .references(() => businesses.id);

export const bookings = pgTable(
  "bookings",
  {
    id: serial().primaryKey(),
    businessId: businessId(),
    // The id we give to the person who booked, to cancel with. Counting ids (1, 2, 3) are easy to guess,
    // so this one is long and random, and the counting one stays inside the database.
    publicId: uuid("public_id").notNull().defaultRandom().unique(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }).notNull(),
    service: text()
      .notNull()
      .references(() => services.id),
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id),
    name: text().notNull(),
    email: text().notNull(),
  },
  // The free times ask for a fortnight of bookings by start time, so look them up by start time.
  (table) => [index("bookings_starts_at_idx").on(table.startsAt)],
);

export const staff = pgTable("staff", {
  id: serial().primaryKey(),
  businessId: businessId(),
  name: text().notNull(),
  // Their work address: the one they sign in to Microsoft with.
  email: text().unique(),
  // What they do there: "owner" runs it; "physio" or "stylist" sees the people who come.
  role: text().notNull().default("physio"),
});

export const services = pgTable("services", {
  id: text().primaryKey(), // like "first-visit"
  businessId: businessId(),
  title: text().notNull(),
  minutes: integer().notNull(),
  priceSek: integer("price_sek").notNull(),
});

// One row for each day a business is open. 0 is Sunday. A day with no row is closed.
export const openingHours = pgTable(
  "opening_hours",
  {
    businessId: businessId(),
    weekday: integer().notNull(),
    opens: time().notNull(),
    closes: time().notNull(),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.weekday] })],
);

export * from "./auth-schema.ts";
