import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { clinic, type Service } from "../../../server/clinic.ts";
import { NextFree } from "../../NextFree";
import { ServiceCards } from "../../ServiceCards";
import { DayPicker } from "../../DayPicker";
import { Booking } from "../../Booking";
import { Times } from "../../Times";
import { about, here } from "../../business";
import type { FreeTimes } from "../../../server/schemas.ts";

// The page's title is the business's name, so it waits for the address too.
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await about(await here())).name };
}

// What the address asks for, like /?day=2026-11-17&service=follow-up. Anyone can type anything there,
// so check it, and fall back to the first day and the business's first service when it doesn't fit.
function choiceFrom(params: Record<string, string | string[] | undefined>, services: Service[]) {
  return z
    .object({
      day: z.iso.date().catch("2026-11-10"),
      service: z
        .string()
        .refine((id) => services.some((s) => s.id === id))
        .catch(services[0].id),
    })
    .parse(params);
}

type Choice = ReturnType<typeof choiceFrom>;

// What a business offers changes rarely: keep it for an hour.
async function offers(business: string) {
  "use cache";
  cacheLife("hours");
  return clinic(business).offers();
}

// A day's free times for a service, kept for an hour: every visit in that hour gets the same answer
// without asking the database. The business, the day and the service are the cache's key: leave the
// business out, and Birch's visitors are sent Linden's times. Every booking and cancel forgets them
// all, by their tag: a closed day's answer names the nearest free time up to two weeks ahead, so one
// booking can change the answers for other days too.
async function cachedFreeTimes(business: string, day: string, service: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("free-times");
  return clinic(business).freeTimesOn(day, service);
}

// The free times for what the address asks for, or null if they couldn't be had.
function freeTimesFor(business: string, { day, service }: Choice) {
  return cachedFreeTimes(business, day, service).catch((error) => {
    console.error(error);
    return null;
  });
}

// The page at /, for the business at this address. Everything on it depends on the address (which
// business, which day, which service), so it waits inside Suspense boundaries, and is made on the
// server for each visit and streamed into the page.
export default function Page({ searchParams }: PageProps<"/">) {
  const business = here();
  const services = business.then(offers);
  const choice = Promise.all([searchParams, services]).then(([params, list]) => choiceFrom(params, list));
  const free = Promise.all([business, choice]).then(([id, chosen]) => freeTimesFor(id, chosen));
  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <Suspense fallback={<div className="h-20" />}>
          <Name business={business} />
        </Suspense>
        <Suspense fallback={null}>
          <Header choice={choice} free={free} />
        </Suspense>
      </header>
      <Suspense fallback={<p className="text-ink-600">Loading the booking…</p>}>
        <Body choice={choice} free={free} services={services} />
      </Suspense>
    </>
  );
}

async function Name({ business }: { business: Promise<string> }) {
  const { name } = await about(await business);
  return (
    <div>
      <h1 className="text-display">{name}</h1>
      <p className="mt-2 text-ink-600">Book a time that suits you.</p>
    </div>
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

async function Body({ choice, free, services }: Parts & { services: Promise<Service[]> }) {
  const [{ day, service }, list] = await Promise.all([choice, services]);
  const picked = list.find((s) => s.id === service)!;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="service-heading">
        <h2 id="service-heading" className="mb-4 text-title">
          Choose a service
        </h2>
        <ServiceCards day={day} service={service} services={list} />
      </section>
      {/* A new day or service is a new Booking, so the time picked for the old one is gone. */}
      <Booking
        key={day + service}
        date={day}
        serviceId={service}
        serviceName={picked.title + ", " + picked.minutes + " minutes"}
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
