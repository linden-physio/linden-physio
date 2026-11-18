import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeClinic } from "./clinic.ts";
import { setting } from "./env.ts";
import { seed, seedWeek } from "./seed.ts";

test("each business sees only its own rows, even through a query that forgets to ask", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  await seedWeek(db);
  t.after(() => db.$client.end());

  // Through the one way in, each business's day has only its own staff and bookings.
  const linden = await makeClinic(db, "linden").day("2026-11-10");
  const birch = await makeClinic(db, "birch").day("2026-11-10");
  assert.deepEqual(
    linden.people.map((p) => p.name),
    ["Karin Holm", "Oskar Nyberg"],
  );
  assert.deepEqual(
    birch.people.flatMap((p) => p.visits.map((v) => v.name)),
    ["Ida Wik", "Tove Ahl"],
  );

  // A query with no business in it, as the app's role, in a transaction for Birch: Postgres's
  // policies still return only Birch's rows.
  const forgetful = (business: string | null) =>
    db.transaction(async (tx) => {
      if (business) await tx.execute(sql`SELECT set_config('app.business', ${business}, true)`);
      await tx.execute(sql`SET LOCAL ROLE clinic_app`);
      return (await tx.execute(sql`SELECT name FROM bookings ORDER BY name`)).rows.map((r) => r.name);
    });
  assert.deepEqual(await forgetful("birch"), ["Ida Wik", "Tove Ahl"]);
  // With no business set at all, nothing.
  assert.deepEqual(await forgetful(null), []);

  // And a row for another business is refused.
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.business', 'birch', true)`);
      await tx.execute(sql`SET LOCAL ROLE clinic_app`);
      await tx.execute(sql`UPDATE bookings SET business_id = 'linden' WHERE name = 'Ida Wik'`);
    }),
    (error: Error) => /row-level security/.test(String((error.cause as Error)?.message)),
  );
});
