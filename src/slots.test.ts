import { test } from "node:test";
import assert from "node:assert/strict";
import { freeTimes } from "./slots.js";

test("a booking that ends at 10:00 leaves 10:00 free", () => {
  const hours = { 2: { open: "09:00", close: "12:00" } };
  const bookings = [{ date: "2026-11-10", start: "09:00", end: "10:00" }];
  assert.deepEqual(freeTimes("2026-11-10", 60, hours, bookings), ["10:00", "10:30", "11:00"]);
});

test("a sports massage at 11:30 would run past closing", () => {
  const hours = { 2: { open: "09:00", close: "12:00" } };
  assert.ok(!freeTimes("2026-11-10", 45, hours, []).includes("11:30"));
});
