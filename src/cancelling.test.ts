import { test } from "node:test";
import assert from "node:assert/strict";
import { setupServer } from "msw/node";
import { alreadyStarted, handlers } from "./mocks/handlers.ts";
import { afterCancel } from "./cancelling.ts";

// The browser's stand-in for the server, answering in Node instead.
const server = setupServer(...handlers);
server.listen();
test.afterEach(() => server.resetHandlers());
test.after(() => server.close());

const booking = { date: "2026-11-10", time: "2026-11-10T09:00:00.000Z" };

test("a cancelled booking says the time is free again", async () => {
  const answer = await fetch("http://localhost:3000/bookings/3f2b8c1e-6a4d-4e9b-9c7a-1d2e3f4a5b6c", {
    method: "DELETE",
  });
  assert.deepEqual(afterCancel(answer.status, booking), { kind: "cancelled", ...booking });
});

test("a booking that has already started can't be cancelled", async () => {
  server.use(alreadyStarted);
  const answer = await fetch("http://localhost:3000/bookings/3f2b8c1e-6a4d-4e9b-9c7a-1d2e3f4a5b6c", {
    method: "DELETE",
  });
  assert.equal(afterCancel(answer.status, booking).kind, "failed");
  assert.equal(answer.status, 409);
});
