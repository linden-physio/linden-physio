import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { about, clinicHere, here } from "../../../../../business";
import { provider } from "../../../../../../server/payments.ts";
import { when } from "../../../../../../server/confirmations.ts";
import { setting } from "../../../../../../server/env.ts";
import { originOf } from "../../../../../../server/address.ts";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your booking · " + (await about(await here())).name };
}

// The page someone comes back to after paying a deposit: whether the booking is confirmed.
export default function Paid({ params, searchParams }: PageProps<"/paid/[id]">) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-display">Your booking</h1>
      </header>
      <Suspense fallback={<p className="text-ink-600">Looking for your booking…</p>}>
        <Answer params={params} searchParams={searchParams} />
      </Suspense>
      <p>
        <Link href="/" className="text-brand-700 underline">
          Book another time
        </Link>
      </p>
    </div>
  );
}

async function Answer({ params, searchParams }: PageProps<"/paid/[id]">) {
  const asked = await headers();
  const id = z.uuid().safeParse((await params).id);
  const booking = id.success ? await (await clinicHere()).booking(id.data) : null;
  const { payment_intent } = await searchParams;
  const intent = typeof payment_intent === "string" ? await provider().paymentIntents.retrieve(payment_intent) : null;
  if (!booking) {
    return (
      <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
        {intent?.status === "succeeded"
          ? "The time you held ran out before the payment came, and someone else has booked it. We'll pay your deposit back. Please book another time."
          : "This time isn't held for you any more. Please book again."}
      </p>
    );
  }
  if (booking.confirmed) {
    return (
      <section role="status" className="flex flex-col gap-2 rounded-md bg-ready-100 px-4 py-3">
        <p className="font-semibold">
          {booking.service} with {booking.with}, {when(booking.startsAt)}
        </p>
        <p>
          We have your {booking.depositSek} kr deposit, and your booking is confirmed. We've emailed {booking.email}.
        </p>
      </section>
    );
  }
  // Paid, and Kassa's event is on its way: look again in a moment.
  if (intent?.status === "succeeded") {
    return (
      <section role="status" className="flex flex-col gap-2 rounded-md bg-ready-100 px-4 py-3">
        <meta httpEquiv="refresh" content="2" />
        <p>We have your payment. Your booking will be confirmed in a moment, and we'll email {booking.email}.</p>
      </section>
    );
  }
  // Not paid yet: the payment was refused, or the bank said no. Show the card form again.
  const form = new URL("/elements/card", setting("KASSA_URL"));
  form.searchParams.set("key", setting("KASSA_PUBLISHABLE_KEY"));
  form.searchParams.set("client_secret", intent?.client_secret ?? "");
  form.searchParams.set("return_url", originOf(asked) + "/bookings/paid");
  return (
    <section className="flex flex-col gap-4">
      <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
        {intent?.last_payment_error?.message ?? "The payment didn't go through."} Your time is still held for a few
        minutes: try again below.
      </p>
      {intent && (
        <iframe
          src={form.toString()}
          title="Pay the deposit"
          className="h-80 w-full rounded-md border border-line-200"
        />
      )}
    </section>
  );
}
