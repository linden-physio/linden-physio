import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { emailConfirmed } from "./confirmations.ts";
import { setting } from "./env.ts";
import { provider } from "./payments.ts";

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
    return { status: 400, body: { error: error instanceof Error ? error.message : "Bad signature" } };
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { business, booking, origin } = intent.metadata;
    const result = await makeClinic(db(), business).paid(booking, intent.id, intent.amount_received, event);
    // The booking is saved. If the email fails now, answering with an error would only make Kassa send
    // the event again, which now changes nothing: so keep the error in the log, and answer 200.
    if (result === "confirmed") {
      await emailConfirmed(business, booking, origin).catch((error) => console.error(error));
    }
  }
  return { status: 200, body: { received: true } };
}
