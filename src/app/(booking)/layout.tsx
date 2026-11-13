import { Suspense } from "react";
import Link from "next/link";
import { about, here } from "../../business";

// The pages for people who book: the booking page and their own bookings, with links at the bottom.
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div id="app">{children}</div>
      <p className="mt-12 flex gap-6">
        <Link className="text-brand-700 underline" href="/bookings">
          Your bookings
        </Link>
        <Suspense fallback={null}>
          <EmailUs />
        </Suspense>
      </p>
    </main>
  );
}

async function EmailUs() {
  const { email } = await about(await here());
  return (
    <a className="text-brand-700 underline" href={"mailto:" + email}>
      Email us
    </a>
  );
}
