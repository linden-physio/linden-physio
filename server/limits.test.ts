import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./routes.ts";
import { noMail } from "./holds.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("one email can hold two times at once, and one address ten an hour", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Monday evening. The bot holds Tuesday's times one after another, from one address.
  let time = new Date("2026-11-09T18:00:00.000Z");
  const app = makeApp(db, () => time, noMail);
  // Tuesday is open 09:00 to 12:00 (08:00 to 11:00 UTC), with two physiotherapists.
  const hold = (at: string, email: string, from = "203.0.113.7") =>
    app.request("/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Real-IP": from },
      body: JSON.stringify({
        start: `2026-11-10T${at}:00.000Z`,
        service: "follow-up",
        name: "A. Person",
        email,
      }),
    });

  // The same address twice is all right; the third is refused until one is confirmed or runs out.
  assert.equal((await hold("08:00", "same@example.com")).status, 201);
  assert.equal((await hold("08:30", "same@example.com")).status, 201);
  const third = await hold("09:00", "same@example.com");
  assert.equal(third.status, 429);
  assert.equal(third.headers.get("Retry-After"), "900");

  // A new email each time: eight more from the same internet address, then no more this hour.
  const times = ["08:00", "08:30", "09:00", "09:00", "09:30", "09:30", "10:00", "10:00"];
  for (const [n, at] of times.entries()) assert.equal((await hold(at, `person${n}@example.com`)).status, 201);
  assert.equal((await hold("10:30", "one-more@example.com")).status, 429);
  // Someone else, from their own address, can still book.
  assert.equal((await hold("10:30", "maja@example.com", "198.51.100.4")).status, 201);

  // An hour later the address can hold again.
  time = new Date("2026-11-09T19:01:00.000Z");
  assert.equal((await hold("10:30", "one-more@example.com")).status, 201);
});
