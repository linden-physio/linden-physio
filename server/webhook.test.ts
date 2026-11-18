import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { kassa } from "../kassa/sdk.ts";

const secret = "whsec_test";
const sign = (body: string, time: number, key = secret) =>
  "t=" +
  time +
  ",v1=" +
  createHmac("sha256", key)
    .update(time + "." + body)
    .digest("hex");

// What our hand-made check did, now done by Kassa's library.
function signedByKassa(body: string, header: string | null, key: string, now: number): boolean {
  const realNow = Date.now;
  Date.now = () => now;
  try {
    kassa("sk_test", "http://kassa.invalid").webhooks.constructEvent(body, header, key);
    return true;
  } catch {
    return false;
  } finally {
    Date.now = realNow;
  }
}

test("only an event signed by Kassa, in the last five minutes, is believed", () => {
  const body = '{"type":"payment_intent.succeeded","data":{"object":{"amount_received":20000}}}';
  const now = 1_795_000_000_000;
  const time = now / 1000;
  assert.equal(signedByKassa(body, sign(body, time), secret, now), true);
  // The same body with one number changed, under the old signature.
  assert.equal(signedByKassa(body.replace("20000", "2000000"), sign(body, time), secret, now), false);
  // Signed by someone who doesn't know the secret.
  assert.equal(signedByKassa(body, sign(body, time, "whsec_guess"), secret, now), false);
  // A real event, recorded and sent again an hour later.
  assert.equal(signedByKassa(body, sign(body, time), secret, now + 60 * 60_000), false);
  assert.equal(signedByKassa(body, null, secret, now), false);
  assert.equal(signedByKassa(body, "t=abc,v1=zz", secret, now), false);
});
