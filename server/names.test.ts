import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./routes.ts";
import { noMail } from "./holds.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";
import { makeClinic } from "./clinic.ts";

// Someone coming back wants the physiotherapist they saw last time, so each free time names who is free.
test("each free time names the physiotherapists who are free then", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  const app = makeApp(db, () => new Date("2026-11-09T18:00:00.000Z"), noMail);
  // The day's free times as "09:00 Karin, Oskar", in UTC: Stockholm is an hour ahead in November.
  const names = async (date: string, service: string) => {
    const answer = await (await app.request(`/free-times?date=${date}&service=${service}`)).json();
    return answer.times.map((time: { startsAt: string; with: string[] }) =>
      [time.startsAt.slice(11, 16), time.with.join(", ")].join(" "),
    );
  };

  // Tuesday, with no bookings: both are free at every time, for every service.
  assert.deepEqual(await names("2026-11-10", "first-visit"), [
    "08:00 Karin, Oskar",
    "08:30 Karin, Oskar",
    "09:00 Karin, Oskar",
    "09:30 Karin, Oskar",
    "10:00 Karin, Oskar",
  ]);
  assert.equal((await names("2026-11-10", "follow-up")).length, 6);
  assert.ok((await names("2026-11-10", "sports-massage")).every((time: string) => time.endsWith("Karin, Oskar")));

  // Book 10:00 (09:00 UTC). It goes to Karin, the first who is free, so her times around it go.
  const booked = await app.request("/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: "2026-11-10T09:00:00.000Z",
      service: "first-visit",
      name: "Maja Lund",
      email: "maja@example.com",
    }),
  });
  assert.equal(booked.status, 201);
  assert.deepEqual(await names("2026-11-10", "follow-up"), [
    "08:00 Karin, Oskar",
    "08:30 Karin, Oskar",
    "09:00 Oskar",
    "09:30 Oskar",
    "10:00 Karin, Oskar",
    "10:30 Karin, Oskar",
  ]);
  assert.deepEqual(await names("2026-11-10", "first-visit"), [
    "08:00 Karin, Oskar",
    "08:30 Oskar",
    "09:00 Oskar",
    "09:30 Oskar",
    "10:00 Karin, Oskar",
  ]);

  // The chip said "Karin, Oskar", so the booking's answer says who it went to. Karin has 10:00 now,
  // so the next booking at 10:00 goes to Oskar.
  const clinic = makeClinic(db, "linden", () => new Date("2026-11-09T18:00:00.000Z"));
  const second = await clinic.book({
    start: "2026-11-10T09:00:00.000Z",
    service: "first-visit",
    name: "Ali Berg",
    email: "ali@example.com",
  });
  assert.deepEqual(second.kind === "held" && second.with, "Oskar");

  // Thursday afternoon too.
  assert.deepEqual((await names("2026-11-12", "first-visit"))[0], "12:00 Karin, Oskar");
});
