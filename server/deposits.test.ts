import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeClinic } from "./clinic.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("a paid deposit confirms the booking, and is kept even when the booking is gone", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  let time = new Date("2026-11-09T18:00:00.000Z");
  const clinic = makeClinic(db, "linden", () => time);
  const nine = "2026-11-10T08:00:00.000Z";
  const hold = (name: string, from: string) =>
    clinic.book({ start: nine, service: "follow-up", name, email: name.toLowerCase() + "@example.com" }, from);

  const maja = await hold("Maja", "203.0.113.1");
  assert.equal(maja.kind, "held");
  if (maja.kind !== "held") return;
  assert.equal(maja.depositSek, 200);
  assert.equal(await clinic.paid(maja.id, "pi_maja", 20000), "confirmed");
  assert.equal((await clinic.booking(maja.id))?.confirmed, true);

  // Tove holds the other physiotherapist, pays slowly on her bank's page, and her 15 minutes run out.
  // Nobody has taken the time, so her row is still there: the payment still confirms it.
  const tove = await hold("Tove", "203.0.113.2");
  if (tove.kind !== "held") assert.fail();
  time = new Date("2026-11-09T18:20:00.000Z");
  assert.equal(await clinic.paid(tove.id, "pi_tove", 20000), "confirmed");

  // Tove cancels (her deposit stays, pointing at no booking). Ida's hold runs out, and Sara takes the time before Ida's payment comes in.
  await clinic.cancel(tove.id);
  const ida = await hold("Ida", "203.0.113.3");
  if (ida.kind !== "held") assert.fail();
  time = new Date("2026-11-09T18:40:00.000Z");
  assert.equal((await hold("Sara", "203.0.113.4")).kind, "held");
  assert.equal(await clinic.paid(ida.id, "pi_ida", 20000), "gone");

  const kept = await db.execute<{ payment_intent: string; booked: boolean }>(
    sql`SELECT payment_intent, booking_id IS NOT NULL AS booked FROM deposits ORDER BY id`,
  );
  assert.deepEqual(
    kept.rows.map((row) => [row.payment_intent, row.booked]),
    [
      ["pi_maja", true],
      ["pi_tove", false],
      ["pi_ida", false],
    ],
  );
});
