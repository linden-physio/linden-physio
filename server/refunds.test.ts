import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeClinic } from "./clinic.ts";
import { cancelBooking } from "./refunds.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("a deposit comes back when the booking is cancelled a day ahead, or by the clinic, and only once", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Monday evening; the bookings are on Tuesday morning and Thursday afternoon.
  const time = new Date("2026-11-09T18:00:00.000Z");
  const now = () => time;
  const clinic = makeClinic(db, "linden", now);
  // A provider that answers the same key with the same refund, as Kassa and Stripe do.
  const made = new Map<string, { id: string; amount: number }>();
  const refunds = async (params: { payment_intent: string; amount: number }, options: { idempotencyKey: string }) => {
    if (!made.has(options.idempotencyKey))
      made.set(options.idempotencyKey, { id: "re_" + made.size, amount: params.amount });
    return made.get(options.idempotencyKey)!;
  };
  let n = 0;
  async function paidBooking(start: string, name: string) {
    const held = await clinic.book(
      { start, service: "follow-up", name, email: name.toLowerCase() + "@example.com" },
      "203.0.113." + ++n,
    );
    if (held.kind !== "held") assert.fail(held.kind);
    await clinic.paid(
      held.id,
      "pi_" + name,
      20000,
      { id: "evt_" + name, type: "payment_intent.succeeded" },
      "http://localhost:5173",
    );
    return held.id;
  }
  const refunded = async () =>
    (await db.execute<{ total: number }>(sql`SELECT coalesce(sum(amount_ore), 0)::int AS total FROM refunds`)).rows[0]
      .total;

  // Maja cancels Thursday's booking on Monday: more than a day ahead, so it comes back.
  const maja = await paidBooking("2026-11-12T12:00:00.000Z", "Maja");
  const cancelled = await cancelBooking(clinic, maja, { person: "maja@example.com" }, now, refunds);
  assert.deepEqual(cancelled, { cancelled: "cancelled", refundedSek: 200, keptSek: 0, failed: false });

  // Ida cancels Tuesday's booking on Monday evening: less than a day ahead, so the clinic keeps it.
  const ida = await paidBooking("2026-11-10T08:00:00.000Z", "Ida");
  const idaResult = await cancelBooking(clinic, ida, { person: "ida@example.com" }, now, refunds);
  assert.equal(idaResult.keptSek, 200);

  // The clinic cancels Tove's Tuesday booking: hers comes back however late.
  const tove = await paidBooking("2026-11-10T09:00:00.000Z", "Tove");
  assert.equal((await cancelBooking(clinic, tove, "clinic", now, refunds)).refundedSek, 200);
  assert.equal(await refunded(), 40000);

  // Asking the provider again with the same key gets the same refund, and it's recorded once.
  await refunds({ payment_intent: "pi_Tove", amount: 20000 }, { idempotencyKey: "refund-pi_Tove" });
  assert.equal(made.size, 2);
});
