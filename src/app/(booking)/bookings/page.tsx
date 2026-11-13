import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "../../../../server/auth.ts";
import { clinicHere } from "../../../business";
import { dayName } from "../../../dayName";
import { clockTime } from "../../../clockTime";
import { LinkForm } from "../../../mine/LinkForm";
import { forgetMe } from "../../../mine/actions";
import { CancelButton } from "../../../mine/CancelButton";

import { about, here } from "../../../business";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your bookings · " + (await about(await here())).name };
}

// The bookings of whoever followed the link from their email. Anyone else is asked for their address.
export default function YourBookings({ searchParams }: PageProps<"/bookings">) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-2">
          <Link href="/" className="text-brand-700 underline">
            <Suspense fallback="Book a time">
              <Name />
            </Suspense>
          </Link>
        </p>
        <h1 className="text-display">Your bookings</h1>
      </header>
      <Suspense fallback={<p className="text-ink-600">Looking for your bookings…</p>}>
        <Bookings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Bookings({ searchParams }: Pick<PageProps<"/bookings">, "searchParams">) {
  // The headers first: they tell next build that this runs for each request, before auth() needs
  // its settings, which a build doesn't have.
  const asked = await headers();
  const session = await auth().api.getSession({ headers: asked });
  if (!session) {
    // A link that was used already, or ran out, comes back here with ?error=…
    const { error } = await searchParams;
    return (
      <section className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
            That link has been used already, or it ran out. Ask for a new one below.
          </p>
        )}
        <p>We'll email you a link that shows your bookings. Write the address you booked with.</p>
        <LinkForm />
      </section>
    );
  }
  const booked = await (await clinicHere()).bookingsFor(session.user.email);
  // Back from the link that confirms a booking (see bookings/confirm), with how many it confirmed.
  const { confirmed } = await searchParams;
  return (
    <section className="flex flex-col gap-4">
      <p className="text-ink-600">For {session.user.email}</p>
      {confirmed !== undefined &&
        (confirmed === "0" ? (
          <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
            There was nothing to confirm: the time you held ran out before the link was opened. Please book again.
          </p>
        ) : (
          <p role="status" className="rounded-md bg-ready-100 px-4 py-3">
            Your booking is confirmed.
          </p>
        ))}
      {booked.length === 0 ? (
        <p>You have no bookings coming up.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {booked.map((booking) => {
            const when =
              dayName(booking.startsAt.slice(0, 10)) +
              " " +
              new Date(booking.startsAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                timeZone: "Europe/Stockholm",
              }) +
              ", " +
              clockTime(booking.startsAt);
            return (
              <li
                key={booking.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-line-200 bg-surface p-4"
              >
                <div>
                  <p className="font-semibold">{when}</p>
                  <p className="text-ink-600">
                    {booking.service} with {booking.with}
                  </p>
                </div>
                <CancelButton id={booking.id} label={when} />
              </li>
            );
          })}
        </ul>
      )}
      <form action={forgetMe}>
        <button type="submit" className="text-brand-700 underline">
          Sign out
        </button>
      </form>
    </section>
  );
}

async function Name() {
  return (await about(await here())).name;
}
