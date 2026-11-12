import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { clinic } from "../../server/clinic.ts";
import { services } from "../services";
import { NextFree } from "../NextFree";
import { ServiceCards } from "../ServiceCards";
import { DayPicker } from "../DayPicker";
import { Booking } from "../Booking";
import { Times } from "../Times";
import type { FreeTimes } from "../../server/schemas.ts";

// What the address asks for, like /?day=2026-11-17&service=follow-up. Anyone can type anything there,
// so check it, and fall back to the first day and service when it doesn't fit.
const Choice = z.object({
  day: z.iso.date().catch("2026-11-10"),
  service: z
    .string()
    .refine((id) => services.some((s) => s.id === id))
    .catch("first-visit"),
});

type Choice = z.infer<typeof Choice>;

// A day's free times for a service, kept for an hour: every visit in that hour gets the same answer
// without asking the database. The day and the service are the cache's key.
async function cachedFreeTimes(day: string, service: string) {
  "use cache";
  cacheLife("hours");
  return clinic().freeTimesOn(day, service);
}

// The free times for what the address asks for, or null if they couldn't be had.
function freeTimesFor({ day, service }: Choice) {
  return cachedFreeTimes(day, service).catch((error) => {
    console.error(error);
    return null;
  });
}

// The page at /. The parts that don't depend on the address (the clinic's name, the headings' places)
// are made once, when the app is built. The parts that do wait for the address inside Suspense
// boundaries, and are made on the server for each visit and streamed into the page.
export default function Page({ searchParams }: PageProps<"/">) {
  const choice = searchParams.then((params) => Choice.parse(params));
  const free = choice.then(freeTimesFor);
  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Linden Physio</h1>
          <p className="mt-2 text-ink-600">Physiotherapy in the middle of town. Book a time that suits you.</p>
        </div>
        <Suspense fallback={null}>
          <Header choice={choice} free={free} />
        </Suspense>
      </header>
      <Suspense fallback={<p className="text-ink-600">Loading the booking…</p>}>
        <Body choice={choice} free={free} />
      </Suspense>
    </>
  );
}

type Parts = { choice: Promise<Choice>; free: Promise<FreeTimes | null> };

async function Header({ choice, free }: Parts) {
  const { day, service } = await choice;
  // Keyed by the day and service, so a new day shows the placeholder instead of waiting with the old one.
  return (
    <Suspense key={day + service} fallback={null}>
      <NextFree date={day} free={free} />
    </Suspense>
  );
}

async function Body({ choice, free }: Parts) {
  const { day, service } = await choice;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="service-heading">
        <h2 id="service-heading" className="mb-4 text-title">
          Choose a service
        </h2>
        <ServiceCards day={day} service={service} />
      </section>
      {/* A new day or service is a new Booking, so the time picked for the old one is gone. */}
      <Booking
        key={day + service}
        date={day}
        serviceId={service}
        days={<DayPicker date={day} service={service} />}
        times={
          <Suspense fallback={<p className="text-ink-600">Looking for free times…</p>}>
            <Times date={day} free={free} />
          </Suspense>
        }
      />
    </div>
  );
}
