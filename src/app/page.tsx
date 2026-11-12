import { Suspense } from "react";
import { z } from "zod";
import { clinic } from "../../server/clinic.ts";
import { services } from "../services";
import { NextFree } from "../NextFree";
import { ServiceCards } from "../ServiceCards";
import { DayPicker } from "../DayPicker";
import { Booking } from "../Booking";
import { Times } from "../Times";

// What the address asks for, like /?day=2026-11-17&service=follow-up. Anyone can type anything there,
// so check it, and fall back to the first day and service when it doesn't fit.
const Choice = z.object({
  day: z.iso.date().catch("2026-11-10"),
  service: z
    .string()
    .refine((id) => services.some((s) => s.id === id))
    .catch("first-visit"),
});

// The page at /. It runs on the server: it reads the day and the service from the address and asks the
// clinic's code for that day's free times, from the database. It doesn't wait for the answer: it sends
// the page at once, and the two parts that need the times wait inside Suspense boundaries, each with a placeholder. When
// the answer comes, their HTML follows in the same response and takes the placeholders' place.
export default async function Page({ searchParams }: PageProps<"/">) {
  const { day, service } = Choice.parse(await searchParams);
  const free = clinic()
    .freeTimesOn(day, service)
    .catch((error) => {
      console.error(error);
      return null;
    });

  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Linden Physio</h1>
          <p className="mt-2 text-ink-600">Physiotherapy in the middle of town. Book a time that suits you.</p>
        </div>
        {/* Keyed by the day and service, so a new day shows the placeholder instead of waiting with the old one. */}
        <Suspense key={day + service} fallback={null}>
          <NextFree date={day} free={free} />
        </Suspense>
      </header>
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
    </>
  );
}
