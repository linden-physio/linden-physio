import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { clinicHere, here } from "../../../../business";
import { provider } from "../../../../../server/payments.ts";
import { originOf } from "../../../../../server/address.ts";
import { emailConfirmed } from "../../../../../server/confirmations.ts";

// Where the payment provider sends the person back after its card form, or after their bank's page,
// with ?payment_intent=pi_… Anyone can type that address, so ask the provider itself, with our secret
// key, whether the payment went through.
export async function GET(request: NextRequest) {
  const asked = await headers();
  const id = request.nextUrl.searchParams.get("payment_intent");
  if (!id) redirect("/");
  const intent = await provider().paymentIntents.retrieve(id);
  const booking = intent.metadata.booking;
  if (intent.metadata.business !== (await here())) redirect("/");
  if (intent.status === "succeeded") {
    const result = await (await clinicHere()).paid(booking, intent.id, intent.amount_received);
    if (result === "confirmed") await emailConfirmed(await here(), booking, originOf(asked));
  }
  redirect("/paid/" + booking + "?payment_intent=" + intent.id);
}
