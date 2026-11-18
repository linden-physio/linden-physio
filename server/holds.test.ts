import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeClinic } from "./clinic.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("a hold nobody confirms lets its time go after 15 minutes, and a confirmed one keeps it", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Monday evening. Two physiotherapists, so Tuesday at nine can be held twice.
  let time = new Date("2026-11-09T18:00:00.000Z");
  const clinic = makeClinic(db, "linden", () => time);
  const nine = "2026-11-10T08:00:00.000Z";
  const hold = (name: string) =>
    clinic.book({ start: nine, service: "follow-up", name, email: name.toLowerCase() + "@example.com" }, "203.0.113.1");
  const nineIsFree = async () =>
    (await clinic.freeTimesOn("2026-11-10", "follow-up"))!.times.some((free) => free.startsAt === nine);

  assert.equal((await hold("Bot")).kind, "held");
  assert.equal((await hold("Maja")).kind, "held");
  assert.equal((await hold("Sara")).kind, "taken");
  assert.equal(await nineIsFree(), false);

  // Maja opens her link after five minutes. The bot never does.
  time = new Date("2026-11-09T18:05:00.000Z");
  assert.equal(await clinic.confirm("maja@example.com"), 1);

  // Sixteen minutes in, the bot's hold has run out: its time is free, and Sara gets it.
  time = new Date("2026-11-09T18:16:00.000Z");
  assert.equal(await nineIsFree(), true);
  assert.equal((await hold("Sara")).kind, "held");
  // A link opened after the hold ran out confirms nothing.
  assert.equal(await clinic.confirm("bot@example.com"), 0);

  // An hour later, Maja's confirmed booking is still there, and Sara's unconfirmed hold has gone.
  time = new Date("2026-11-09T19:16:00.000Z");
  const day = await clinic.day("2026-11-10");
  assert.deepEqual(
    day.people.flatMap((person) => person.visits.map((visit) => visit.name)),
    ["Maja"],
  );
});
