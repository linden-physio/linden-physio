import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeSessions } from "./sessions.ts";
import { setting } from "./env.ts";
import { seed, seedPasswords } from "./seed.ts";

test("a session belongs to whoever signed in, until it runs out or they sign out", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "server/migrations" });
  await seed(db);
  await seedPasswords(db);
  t.after(() => db.$client.end());

  let time = new Date("2026-11-10T08:00:00.000Z");
  const sessions = makeSessions(db, () => time);

  assert.equal(await sessions.checkSignIn("karin@lindenphysio.com", "oskar-on-this-computer"), null);
  assert.equal(await sessions.checkSignIn("nobody@lindenphysio.com", "karin-on-this-computer"), null);
  const karin = await sessions.checkSignIn("Karin@lindenphysio.com ", "karin-on-this-computer");
  assert.equal(karin?.name, "Karin Holm");

  const { token } = await sessions.start(karin!.id);
  assert.equal((await sessions.find(token))?.name, "Karin Holm");
  assert.equal(await sessions.find("a-token-nobody-was-given"), null);

  // The table holds only the token's hash.
  const rows = (await db.execute(sql`SELECT token_hash FROM sessions`)).rows as { token_hash: string }[];
  assert.notEqual(rows[0].token_hash, token);

  // A week and a minute later it has run out.
  time = new Date("2026-11-17T08:01:00.000Z");
  assert.equal(await sessions.find(token), null);

  time = new Date("2026-11-10T09:00:00.000Z");
  await sessions.end(token);
  assert.equal(await sessions.find(token), null);
});
