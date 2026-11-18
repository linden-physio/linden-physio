import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./routes.ts";
import { noMail } from "./holds.ts";
import { setting } from "./env.ts";

test("a booking with no name and a start of 'soon' is refused before it reaches the database", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  // The request names no business, so the server still looks up whose address it came to: it needs the
  // tables, even on an empty test database.
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  t.after(() => db.$client.end());

  const answer = await makeApp(db, undefined, noMail).request("/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: "soon", service: "first-visit", email: "maja@example.com" }),
  });

  assert.equal(answer.status, 400);
  const body = await answer.json();
  assert.deepEqual(
    body.problems.map((problem: { path: string }) => problem.path),
    ["start", "name"],
  );
});
