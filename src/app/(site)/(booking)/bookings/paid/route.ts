import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { here } from "../../../../../business";
import { provider } from "../../../../../../server/payments.ts";

// Where the payment provider sends the person back after its card form, or after their bank's page,
// with ?payment_intent=pi_… Only to show them how it went: the booking is confirmed when Kassa tells
// us it's paid (webhook.ts), whether or not they ever come back here.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("payment_intent");
  if (!id) redirect("/");
  const intent = await provider().paymentIntents.retrieve(id);
  const booking = intent.metadata.booking;
  if (intent.metadata.business !== (await here())) redirect("/");
  redirect("/paid/" + booking + "?payment_intent=" + intent.id);
}
