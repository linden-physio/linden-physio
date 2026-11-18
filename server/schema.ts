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
  // How its staff sign in: "microsoft" (a work account in its Entra ID) or "email" (a link).
  staffSignIn: text("staff_sign_in").notNull().default("email"),
  // Its colours, darkest first: for links, for buttons, and for light backgrounds.
  colours: text().array().notNull().default(["#23614a", "#2f7d5b", "#eaf4ef"]),
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
    // A new booking is only held, until the person opens the link we email them, and then it's
    // confirmed. A hold nobody confirms lets the time go at held_until.
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
    heldUntil: timestamp("held_until", { withTimezone: true, mode: "string" }),
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
  // One line about it, under its name on the booking page.
  line: text().notNull().default(""),
  // Where it comes in the list.
  position: integer().notNull().default(0),
  // What the person pays when they book, to hold the time: the rest at the visit. 0 for none.
  depositSek: integer("deposit_sek").notNull().default(0),
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

// Each hold, by the internet address it came from, so that one address can't hold every time in the
// book. Kept apart from the bookings because a hold nobody confirms is deleted, and it must still count.
export const holdsMade = pgTable(
  "holds_made",
  {
    id: serial().primaryKey(),
    businessId: businessId(),
    madeFrom: text("made_from").notNull(),
    madeAt: timestamp("made_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("holds_made_from_idx").on(table.madeFrom, table.madeAt)],
);

// Every deposit paid, as the payment provider reported it: the money that came in. A booking can be
// gone by the time its deposit arrives (its time ran out and someone else took it), and the money still
// came in, so the deposit stays with no booking.
export const deposits = pgTable("deposits", {
  id: serial().primaryKey(),
  businessId: businessId(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  // The payment's id at the provider, like pi_3Qx… One deposit for each payment, however many times
  // we hear that it was paid.
  paymentIntent: text("payment_intent").notNull().unique(),
  // In öre, as payment providers count: 200 kr is 20000.
  amountOre: integer("amount_ore").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }).notNull(),
});

// Each event from the payment provider we've acted on, by its id (evt_…). The provider sends an event
// again when it isn't sure we got it, and the second one bounces off the row already here.
export const providerEvents = pgTable("provider_events", {
  id: text().primaryKey(),
  businessId: businessId(),
  type: text().notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }).notNull(),
});

// Each deposit paid back, by the provider's id for the refund (re_…): money that went out.
export const refunds = pgTable("refunds", {
  id: serial().primaryKey(),
  businessId: businessId(),
  depositId: integer("deposit_id")
    .notNull()
    .references(() => deposits.id),
  providerRefund: text("provider_refund").notNull().unique(),
  amountOre: integer("amount_ore").notNull(),
  refundedAt: timestamp("refunded_at", { withTimezone: true, mode: "string" }).notNull(),
});
