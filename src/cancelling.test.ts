import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "../server/routes.ts";
import { setting } from "../server/env.ts";
import { seed } from "../server/seed.ts";
import { afterCancel } from "./cancelling.ts";

// What the page tells the person after a cancel, from the clinic's real answers: the server's code is in
// this repository now, so the test asks it instead of a stand-in.
test("the page's message for each answer to a cancel", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Monday evening, then Tuesday at ten past ten.
  let time = new Date("2026-11-09T18:00:00.000Z");
  const app = makeApp(db, () => time);
  const made = await app.request("/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: "2026-11-10T09:00:00.000Z",
      service: "first-visit",
      name: "Maja",
      email: "maja@example.com",
    }),
  });
  const { id } = await made.json();
  const cancel = async () => (await app.request("/bookings/" + id, { method: "DELETE" })).status;
  const booking = { date: "2026-11-10", time: "2026-11-10T09:00:00.000Z" };

  time = new Date("2026-11-10T09:10:00.000Z");
  assert.equal(afterCancel(await cancel(), booking).kind, "failed"); // it has started: 409
  time = new Date("2026-11-09T18:00:00.000Z");
  assert.deepEqual(afterCancel(await cancel(), booking), { kind: "cancelled", ...booking }); // 204
  assert.match(String(Object.values(afterCancel(await cancel(), booking))), /couldn't find/); // gone: 404
});
