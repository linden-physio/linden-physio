import { StrictMode } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ServiceCards, services } from "./ServiceCards";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";
import { NextFree } from "./NextFree";
import { useChoice } from "./store";
import { z } from "zod";
import { useFreeTimes } from "./useFreeTimes";
import { Button } from "@/components/ui/button";

// npm run dev:mock answers the requests the server can't answer yet in the browser, from the contract.
if (import.meta.env.VITE_MOCK_API === "on") {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
}

// The page: the header, and the booking section below it. Both read the visitor's choice from the store.
function App() {
  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Linden Physio</h1>
          <p className="mt-2 text-ink-600">Physiotherapy in the middle of town. Book a time that suits you.</p>
        </div>
        <NextFree />
      </header>
      <BookingSection />
    </>
  );
}

// The whole booking section, described from the state.
function BookingSection() {
  const { date, serviceId, picked, showDay, showService, pick } = useChoice();
  const service = services.find((s) => s.id === serviceId)!;

  const free = useFreeTimes(date, serviceId);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="service-heading">
        <h2 id="service-heading" className="mb-4 text-title">
          Choose a service
        </h2>
        <ServiceCards service={serviceId} onChange={showService} />
      </section>
      <section aria-labelledby="time-heading" className="times">
        <h2 id="time-heading" className="mb-4 text-title">
          Free times
        </h2>
        <DayPicker date={date} onChange={showDay} />
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
              onPick={pick}
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
          onBooked={() => pick(null)}
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
