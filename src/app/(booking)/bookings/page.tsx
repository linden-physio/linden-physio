import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "../../../../server/auth.ts";
import { clinic } from "../../../../server/clinic.ts";
import { dayName } from "../../../dayName";
import { clockTime } from "../../../clockTime";
import { LinkForm } from "../../../mine/LinkForm";
import { forgetMe } from "../../../mine/actions";

export const metadata: Metadata = { title: "Your bookings · Linden Physio" };

// The bookings of whoever followed the link from their email. Anyone else is asked for their address.
export default function YourBookings({ searchParams }: PageProps<"/bookings">) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-2">
          <Link href="/" className="text-brand-700 underline">
            Linden Physio
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
  const booked = await clinic().bookingsFor(session.user.email);
  return (
    <section className="flex flex-col gap-4">
      <p className="text-ink-600">For {session.user.email}</p>
      {booked.length === 0 ? (
        <p>You have no bookings coming up.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {booked.map((booking) => (
            <li key={booking.id} className="rounded-md border border-line-200 bg-surface p-4">
              <p className="font-semibold">
                {dayName(booking.startsAt.slice(0, 10))}{" "}
                {new Date(booking.startsAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Stockholm",
                })}
                , {clockTime(booking.startsAt)}
              </p>
              <p className="text-ink-600">
                {booking.service} with {booking.with}
              </p>
            </li>
          ))}
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
