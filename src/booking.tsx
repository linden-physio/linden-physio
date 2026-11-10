import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { freeTimes, nearestFreeTime, type Booking, type OpeningHours } from "./slots.js";
import { ServiceCards, services } from "./ServiceCards";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";

// The clinic's opening hours, by weekday (0 is Sunday), and the times already booked.
// Both come from files the server sends.
const hoursResponse = await fetch("/hours.json");
const hours: Record<number, OpeningHours> = await hoursResponse.json();
const bookingsResponse = await fetch("/bookings.json");
const bookings: Booking[] = await bookingsResponse.json();

// The whole booking section, described from the state.
function BookingSection() {
  const [date, setDate] = useState("2026-11-10");
  const [picked, setPicked] = useState<string | null>(null);
  const [length, setLength] = useState(60);

  const service = services.find((s) => s.length === length)!;
  const times = freeTimes(date, length, hours, bookings);
  const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
  const nearest = closed ? nearestFreeTime(date, length, hours, bookings) : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="service-heading">
        <h2 id="service-heading" className="mb-4 text-title">
          Choose a service
        </h2>
        <ServiceCards
          length={length}
          onChange={(length) => {
            setLength(length);
            setPicked(null);
          }}
        />
      </section>
      <section aria-labelledby="time-heading" className="times">
        <h2 id="time-heading" className="mb-4 text-title">
          Free times
        </h2>
        <DayPicker
          date={date}
          onChange={(date) => {
            setDate(date);
            setPicked(null);
          }}
        />
        <div className="mt-6">
          <TimeList date={date} times={times} closed={closed} nearest={nearest} picked={picked} onPick={setPicked} />
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

createRoot(document.querySelector("#booking")!).render(<BookingSection />);
