import { test } from "node:test";
import assert from "node:assert/strict";
import { may } from "./permissions.ts";

const karin = { id: 1, role: "owner" };
const oskar = { id: 2, role: "physio" };
const someoneNew = { id: 3, role: "receptionist" };

test("the owner may do everything", () => {
  assert.equal(may(karin, { do: "see the takings" }), true);
  assert.equal(may(karin, { do: "cancel", staffId: 1 }), true);
  assert.equal(may(karin, { do: "cancel", staffId: 2 }), true);
});

test("a physio may cancel their own patients' bookings, and see no takings", () => {
  assert.equal(may(oskar, { do: "see the takings" }), false);
  assert.equal(may(oskar, { do: "cancel", staffId: 2 }), true);
  assert.equal(may(oskar, { do: "cancel", staffId: 1 }), false);
});

test("a role nobody wrote a rule for may do nothing", () => {
  assert.equal(may(someoneNew, { do: "see the takings" }), false);
  assert.equal(may(someoneNew, { do: "cancel", staffId: 3 }), false);
});
