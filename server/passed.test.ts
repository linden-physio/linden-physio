import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./routes.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("the server refuses a time that has already passed, whoever posts it", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Tuesday 10 November at ten past ten in the clinic.
  const app = makeApp(db, () => new Date("2026-11-10T09:10:00.000Z"));
  const book = (start: string) =>
    app.request("/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, service: "first-visit", name: "Maja Lund", email: "maja@example.com" }),
    });

  // Monday, and earlier the same morning: both have passed.
  for (const start of ["2026-11-09T09:00:00.000Z", "2026-11-10T08:00:00.000Z"]) {
    const answer = await book(start);
    assert.equal(answer.status, 409);
    assert.deepEqual(await answer.json(), { error: "That time has already passed." });
  }
  // Later the same day is still free.
  const later = await book("2026-11-10T10:00:00.000Z");
  assert.equal(later.status, 201);

  const [{ count }] = (await db.execute(sql`SELECT count(*)::int AS count FROM bookings`)).rows as { count: number }[];
  assert.equal(count, 1);
});
