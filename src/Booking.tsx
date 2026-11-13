"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";

// The time the visitor picked, for the time chips deeper down, which the server makes.
const Picked = createContext<{ picked: string | null; pick: (time: string) => void }>({
  picked: null,
  pick: () => {},
});
export const usePicked = () => use(Picked);

// The parts of the page that change while the visitor uses it: the time they picked, and the booking.
// They run in the browser. The day picker (days) and the free times (times) are made on the server and
// only pass through here, so the server can wait for the times while the rest of the page is on screen.
export function Booking({
  date,
  serviceId,
  serviceName,
  days,
  times,
}: {
  date: string;
  serviceId: string;
  // Like "Follow-up, 30 minutes".
  serviceName: string;
  days: ReactNode;
  times: ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const router = useRouter();

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
        {days}
        <div className="mt-6">
          <Picked value={{ picked, pick: setPicked }}>{times}</Picked>
        </div>
      </section>
      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-4 rounded-md border border-line-200 bg-surface p-6"
      >
        <h2 id="details-heading" className="text-title">
          Your booking
        </h2>
        <Summary date={date} picked={picked} service={serviceName} />
        <BookingForm
          date={date}
          picked={picked}
          service={serviceName}
          serviceId={serviceId}
          onSending={() => setPicked(null)}
          onChanged={changed}
        />
      </section>
    </>
  );
}
