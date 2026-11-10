import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ServiceCards, services } from "./ServiceCards";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";
import { getFreeTimes, type FreeTimes } from "./api";

// The whole booking section, described from the state.
function BookingSection({ first }: { first: FreeTimes }) {
  const [date, setDate] = useState("2026-11-10");
  const [picked, setPicked] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("first-visit");
  const [free, setFree] = useState(first);

  const service = services.find((s) => s.id === serviceId)!;

  // Show a day and a service, and ask the server for their free times.
  async function show(date: string, serviceId: string) {
    setDate(date);
    setServiceId(serviceId);
    setPicked(null);
    setFree(await getFreeTimes(date, serviceId));
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="service-heading">
        <h2 id="service-heading" className="mb-4 text-title">
          Choose a service
        </h2>
        <ServiceCards service={serviceId} onChange={(serviceId) => show(date, serviceId)} />
      </section>
      <section aria-labelledby="time-heading" className="times">
        <h2 id="time-heading" className="mb-4 text-title">
          Free times
        </h2>
        <DayPicker date={date} onChange={(date) => show(date, serviceId)} />
        <div className="mt-6">
          <TimeList
            date={date}
            times={free.times}
            closed={free.closed}
            nearest={free.nearest}
            picked={picked}
            onPick={setPicked}
          />
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
        <BookingForm date={date} picked={picked} service={service.name} />
      </section>
    </div>
  );
}

const root = createRoot(document.querySelector("#booking")!);
try {
  // The first day's free times, before anything is drawn.
  const first = await getFreeTimes("2026-11-10", "first-visit");
  root.render(<BookingSection first={first} />);
} catch {
  root.render(
    <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
      We couldn't load the free times. Please try again in a minute, or email us.
    </p>,
  );
}
