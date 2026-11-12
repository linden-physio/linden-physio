"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";
import { services } from "./services";
import type { FreeTimes } from "./api";

// The parts of the page that change while the visitor uses it: the time they picked, and the booking.
// They run in the browser. The free times arrive with the page, from the server; the day picker
// (children) is made on the server too, and only passes through here.
export function Booking({
  date,
  serviceId,
  free,
  children,
}: {
  date: string;
  serviceId: string;
  free: FreeTimes | null;
  children: ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const router = useRouter();
  const service = services.find((s) => s.id === serviceId)!;

  // The free times have changed on the server: ask it for this page again. What's on screen here, like
  // the message under the form, stays.
  function changed() {
    setPicked(null);
    router.refresh();
  }

  return (
    <>
      <section aria-labelledby="time-heading" className="times">
        <h2 id="time-heading" className="mb-4 text-title">
          Free times
        </h2>
        {children}
        <div className="mt-6">
          {free === null ? (
            <div role="alert" className="flex items-center gap-4 rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
              We couldn't load the free times.
              <Button variant="outline" onClick={() => router.refresh()}>
                Try again
              </Button>
            </div>
          ) : (
            <TimeList
              date={date}
              times={free.times}
              closed={free.closed}
              nearest={free.nearest}
              picked={picked}
              onPick={setPicked}
            />
          )}
        </div>
      </section>
      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-4 rounded-md border border-line-200 bg-surface p-6"
      >
        <h2 id="details-heading" className="text-title">
          Your booking
        </h2>
        <Summary date={date} picked={picked} service={service.name} />
        <BookingForm date={date} picked={picked} service={service.name} serviceId={serviceId} onChanged={changed} />
      </section>
    </>
  );
}
