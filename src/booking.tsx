import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ServiceCards, services } from "./ServiceCards";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";
import { z } from "zod";
import { getFreeTimes, type FreeTimes } from "./api";
import { Button } from "@/components/ui/button";

// The free times, while we wait for them and once they've come.
type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "ready"; times: FreeTimes };

// npm run dev:mock answers the requests the server can't answer yet in the browser, from the contract.
if (import.meta.env.VITE_MOCK_API === "on") {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
}

// The whole booking section, described from the state.
function BookingSection() {
  const [date, setDate] = useState("2026-11-10");
  const [picked, setPicked] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("first-visit");
  const [free, setFree] = useState<Loaded>({ kind: "loading" });
  // Counts the times we've asked again: after a failure, or after a booking changed the free times.
  const [asked, setAsked] = useState(0);

  const service = services.find((s) => s.id === serviceId)!;

  // Keep the free times in step with the server for the day and service on screen.
  useEffect(() => {
    // When the day or service changes before the answer comes, the cleanup below cancels the request,
    // so an old answer can't land on the new day.
    const controller = new AbortController();
    getFreeTimes(date, serviceId, controller.signal).then(
      (times) => setFree({ kind: "ready", times }),
      (error) => {
        if (controller.signal.aborted) return;
        console.error(
          error instanceof z.ZodError ? "The server's answer doesn't fit:\n" + z.prettifyError(error) : error,
        );
        setFree({ kind: "error" });
      },
    );
    return () => controller.abort();
  }, [date, serviceId, asked]);

  // Show a day and a service. The effect above asks for their free times.
  function show(date: string, serviceId: string) {
    setDate(date);
    setServiceId(serviceId);
    setPicked(null);
    setFree({ kind: "loading" });
  }

  // Ask again for the same day and service.
  function askAgain() {
    setFree({ kind: "loading" });
    setAsked(asked + 1);
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
          {free.kind === "loading" && <p className="text-ink-600">Looking for free times…</p>}
          {free.kind === "error" && (
            <div role="alert" className="flex items-center gap-4 rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
              We couldn't load the free times.
              <Button variant="outline" onClick={askAgain}>
                Try again
              </Button>
            </div>
          )}
          {free.kind === "ready" && (
            <TimeList
              date={date}
              times={free.times.times}
              closed={free.times.closed}
              nearest={free.times.nearest}
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
        <BookingForm
          date={date}
          picked={picked}
          service={service.name}
          serviceId={serviceId}
          onBooked={() => {
            setPicked(null);
            askAgain();
          }}
        />
      </section>
    </div>
  );
}

// In development, StrictMode runs each effect, cleans it up and runs it again, to show whether the cleanup works.
createRoot(document.querySelector("#booking")!).render(
  <StrictMode>
    <BookingSection />
  </StrictMode>,
);
