import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { enqueue, work, type Job } from "./jobs.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("two workers never take the same job, a failed one comes back later, and a key makes one job", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  let time = new Date("2026-11-09T17:00:00.000Z");
  const now = () => time;
  // Forty reminders; the schedule runs twice, and the keys keep them forty.
  for (let run = 0; run < 2; run++) {
    for (let i = 0; i < 40; i++) {
      const added = await enqueue(db, {
        business: "linden",
        kind: "reminder",
        payload: { n: String(i) },
        key: "reminder-" + i,
        runAt: time,
      });
      assert.equal(added, run === 0, "only the first run adds the job");
    }
  }
  const [{ count }] = (await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM jobs`)).rows;
  assert.equal(count, 40);

  // The provider refuses every fourth send the first time, as a provider over its limit does.
  const sent: string[] = [];
  const tried = new Set<string>();
  const handlers = {
    reminder: async (job: Job) => {
      const n = job.payload.n;
      if (Number(n) % 4 === 0 && !tried.has(n)) {
        tried.add(n);
        throw new Error("429 Too many requests");
      }
      sent.push(n);
    },
  };
  // Two workers at once, as two schedule runs or two servers might be.
  const fast = { perSecond: 1000, now };
  const [a, b] = await Promise.all([work(db, handlers, fast), work(db, handlers, fast)]);
  assert.equal(a.done + b.done, 30);
  assert.equal(a.failed + b.failed, 10);
  assert.equal(new Set(sent).size, sent.length, "no reminder was sent twice");

  // The refused ten wait 30 seconds; a minute later they go.
  time = new Date("2026-11-09T17:01:00.000Z");
  assert.deepEqual(await work(db, handlers, fast), { done: 10, failed: 0 });
  assert.equal(new Set(sent).size, 40);
});
