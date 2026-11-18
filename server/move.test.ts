import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeClinic } from "./clinic.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("a person moves their own confirmed booking to a free time, and nobody else's", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  const now = () => new Date("2026-11-23T08:00:00.000Z");
  const clinic = makeClinic(db, "linden", now);
  const held = await clinic.book(
    { start: "2026-11-26T12:30:00.000Z", service: "follow-up", name: "Eva", email: "eva@example.com" },
    "203.0.113.9",
  );
  if (held.kind !== "held") assert.fail(held.kind);
  // Not paid yet, so not confirmed: a hold isn't moved.
  assert.equal((await clinic.move(held.id, "eva@example.com", "2026-12-01T08:00:00.000Z")).kind, "missing");
  await clinic.paid(held.id, "pi_eva", 20000, { id: "evt_eva", type: "payment_intent.succeeded" }, "");

  assert.equal((await clinic.move(held.id, "someone@example.com", "2026-12-01T08:00:00.000Z")).kind, "missing");
  assert.equal((await clinic.move(held.id, "eva@example.com", "2026-11-20T08:00:00.000Z")).kind, "passed");
  // Saturday: closed, so no one is free.
  assert.equal((await clinic.move(held.id, "eva@example.com", "2026-11-28T08:00:00.000Z")).kind, "taken");
  const moved = await clinic.move(held.id, "Eva@Example.com", "2026-12-01T08:00:00.000Z");
  assert.equal(moved.kind, "moved");
  const [booking] = await clinic.bookingsFor("eva@example.com");
  assert.equal(booking.startsAt, "2026-12-01T08:00:00.000Z");
  // The deposit is still the booking's.
  assert.equal((await clinic.depositsOf(held.id))?.deposits.length, 1);
});
