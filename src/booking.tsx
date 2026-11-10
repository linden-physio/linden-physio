import { StrictMode, useState } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ServiceCards, services } from "./ServiceCards";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";
import { NextFree } from "./NextFree";
import { z } from "zod";
import { useFreeTimes } from "./useFreeTimes";
import { Button } from "@/components/ui/button";

// npm run dev:mock answers the requests the server can't answer yet in the browser, from the contract.
if (import.meta.env.VITE_MOCK_API === "on") {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
}

// The page: the header, and the booking section below it. The day and service live here, in the
// parent of both, because both need them.
function App() {
  const [date, setDate] = useState("2026-11-10");
  const [serviceId, setServiceId] = useState("first-visit");
  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Linden Physio</h1>
          <p className="mt-2 text-ink-600">Physiotherapy in the middle of town. Book a time that suits you.</p>
        </div>
        <NextFree date={date} serviceId={serviceId} />
      </header>
      <BookingSection date={date} setDate={setDate} serviceId={serviceId} setServiceId={setServiceId} />
    </>
  );
}

// The whole booking section, described from the state.
function BookingSection({
  date,
  setDate,
  serviceId,
  setServiceId,
}: {
  date: string;
  setDate: (date: string) => void;
  serviceId: string;
  setServiceId: (serviceId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId)!;

  const free = useFreeTimes(date, serviceId);

  function show(date: string, serviceId: string) {
    setDate(date);
    setServiceId(serviceId);
    setPicked(null);
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
          {free.isPending && <p className="text-ink-600">Looking for free times…</p>}
          {free.isError && (
            <div role="alert" className="flex items-center gap-4 rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
              We couldn't load the free times.
              <Button variant="outline" onClick={() => free.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {free.isSuccess && (
            <TimeList
              date={date}
              times={free.data.times}
              closed={free.data.closed}
              nearest={free.data.nearest}
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
            free.refetch();
          }}
        />
      </section>
    </div>
  );
}

// One cache for the whole page. A request that fails is logged, with the problems when the answer didn't fit.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) =>
      console.error(
        error instanceof z.ZodError ? "The server's answer doesn't fit:\n" + z.prettifyError(error) : error,
      ),
  }),
});

// In development, StrictMode runs each effect, cleans it up and runs it again, to show whether the cleanup works.
createRoot(document.querySelector("#app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
