import { createHmac, timingSafeEqual } from "node:crypto";
import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { emailConfirmed } from "./confirmations.ts";
import { setting } from "./env.ts";
import type { PaymentIntent } from "../kassa/sdk.ts";

// How old a signed event may be, in seconds: an event someone recorded and sends again an hour later
// is refused.
const TOLERANCE = 5 * 60;

// Did Kassa send this? The header is "t=1795011770,v1=5257a8…": the time it was signed, and an
// HMAC-SHA256, under the secret only Kassa and we know, of the time, a dot and the body exactly as it
// came. Anyone can post to our address; only Kassa can make this signature. The same tool as the
// session cookie's signature in film 38.
export function signedByKassa(raw: string, header: string | null, secret: string, now = Date.now()): boolean {
  const parts = Object.fromEntries((header ?? "").split(",").map((part) => part.split("=", 2)));
  const time = Number(parts.t);
  if (!Number.isInteger(time) || !parts.v1) return false;
  const expected = createHmac("sha256", secret)
    .update(time + "." + raw)
    .digest();
  const given = Buffer.from(parts.v1, "hex");
  // Compared in constant time: a plain === stops at the first wrong byte, and how long it takes says
  // how much of a guess was right.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  return Math.abs(now / 1000 - time) <= TOLERANCE;
}

type Event = { id: string; type: string; data: { object: PaymentIntent } };

// An event from Kassa, as it came: the raw body (the signature is over these exact bytes, so it's read
// before any parsing) and its Kassa-Signature header. Answer quickly: Kassa waits only 10 seconds, and
// sends the event again later if we don't answer 2xx.
export async function kassaEvent(raw: string, signature: string | null): Promise<{ status: number; body: object }> {
  if (!signedByKassa(raw, signature, setting("KASSA_WEBHOOK_SECRET"))) {
    return { status: 400, body: { error: "The signature doesn't match." } };
  }
  const event: Event = JSON.parse(raw);
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { business, booking, origin } = intent.metadata;
    const result = await makeClinic(db(), business).paid(booking, intent.id, intent.amount_received);
    if (result === "confirmed") await emailConfirmed(business, booking, origin);
  }
  return { status: 200, body: { received: true } };
}
