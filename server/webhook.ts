import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { setting } from "./env.ts";
import { provider } from "./payments.ts";
import { log } from "./log.ts";

// An event from Kassa, as it came: the raw body (the signature is over these exact bytes, so it's read
// before any parsing) and its Kassa-Signature header. Answer quickly: Kassa waits only 10 seconds, and
// sends the event again later if we don't answer 2xx.
export async function kassaEvent(raw: string, signature: string | null): Promise<{ status: number; body: object }> {
  // Kassa's library checks the signature as we did by hand: an HMAC of the time and the raw body, in
  // constant time, at most five minutes old. It throws if it doesn't match.
  let event;
  try {
    event = provider().webhooks.constructEvent(raw, signature, setting("KASSA_WEBHOOK_SECRET"));
  } catch (error) {
    log("warn", "webhook refused", { reason: error instanceof Error ? error.message : "bad signature" });
    return { status: 400, body: { error: error instanceof Error ? error.message : "Bad signature" } };
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { business, booking, origin } = intent.metadata;
    // Confirms the booking, and queues the email, in one transaction.
    const outcome = await makeClinic(db(), business).paid(booking, intent.id, intent.amount_received, event, origin);
    log("info", "payment heard", { booking, business, kassaEvent: event.id, paymentIntent: intent.id, outcome });
  } else {
    log("info", "event ignored", { kassaEvent: event.id, type: event.type });
  }
  return { status: 200, body: { received: true } };
}
