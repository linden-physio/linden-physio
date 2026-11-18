import { kassa } from "../kassa/sdk.ts";
import { setting } from "./env.ts";

// The card payment provider: Kassa, our stand-in for Stripe (kassa/). The secret key stays on this
// server: with it, anyone could take payments and refunds in the clinic's name. The publishable key
// may be in the page: it can only show the card form.
export function provider() {
  return kassa(setting("KASSA_SECRET_KEY"), setting("KASSA_URL"));
}

// Start paying a booking's deposit: a payment intent at the provider, for the amount, with the booking's
// id kept in it. Returns the address of the provider's card form, which the page shows in a frame.
// The card number is typed into that form and goes to the provider; it never comes here.
// back is where the provider sends the person once they've paid, like https://lindenphysio.com/bookings/paid.
export async function startDeposit(deposit: {
  business: string;
  booking: string;
  amountSek: number;
  description: string;
  back: string;
}): Promise<string> {
  const intent = await provider().paymentIntents.create({
    // Payment providers count in the currency's smallest unit: öre. 200 kr is 20000.
    amount: deposit.amountSek * 100,
    currency: "sek",
    description: deposit.description,
    metadata: { business: deposit.business, booking: deposit.booking },
  });
  const form = new URL("/elements/card", setting("KASSA_URL"));
  form.searchParams.set("key", setting("KASSA_PUBLISHABLE_KEY"));
  form.searchParams.set("client_secret", intent.client_secret);
  form.searchParams.set("return_url", deposit.back);
  return form.toString();
}
