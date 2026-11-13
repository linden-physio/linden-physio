import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, hashPassword } from "./passwords.ts";

test("a stored password matches only itself, and never holds the password", async () => {
  const stored = await hashPassword("karin-on-this-computer");
  assert.ok(!stored.includes("karin"));
  assert.equal(await checkPassword("karin-on-this-computer", stored), true);
  assert.equal(await checkPassword("karin-on-this-computer ", stored), false);
  assert.equal(await checkPassword("oskar-on-this-computer", stored), false);
  // The same password twice gives two different rows: each has its own salt.
  assert.notEqual(await hashPassword("karin-on-this-computer"), stored);
});
