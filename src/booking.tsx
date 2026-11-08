import { useState } from "react";
import { createRoot } from "react-dom/client";
import { freeTimes, type Booking, type OpeningHours } from "./slots.js";
import { DayPicker } from "./DayPicker";
import { TimeList } from "./TimeList";
import { Summary } from "./Summary";
import { BookingForm } from "./BookingForm";

// The clinic's opening hours, by weekday (0 is Sunday).
const hours: Record<number, OpeningHours> = {
  0: "closed",
  1: { open: "09:00", close: "12:00" },
  2: { open: "09:00", close: "12:00" },
  3: { open: "09:00", close: "12:00" },
  4: { open: "13:00", close: "17:00" },
  5: { open: "09:00", close: "12:00" },
  6: "closed",
};

// Times already booked.
const bookings: Booking[] = [
  { date: "2026-11-10", start: "09:00", end: "10:00" },
  { date: "2026-11-11", start: "11:00", end: "12:00" },
];

const services = [
  { length: 60, name: "First visit, 60 minutes" },
  { length: 30, name: "Follow-up, 30 minutes" },
  { length: 45, name: "Sports massage, 45 minutes" },
];

// The whole booking section, described from the state.
function BookingSection() {
  const [date, setDate] = useState("2026-11-10");
  const [picked, setPicked] = useState<string | null>(null);
  const [length, setLength] = useState(60);

  const service = services.find((s) => s.length === length)!;
  const times = freeTimes(date, length, hours, bookings);

  return (
    <section className="times">
      <h2>Free times</h2>
      <label>
        Service{" "}
        <select
          id="service"
          value={length}
          onChange={(event) => {
            setLength(Number(event.target.value));
            setPicked(null);
          }}
        >
          {services.map((s) => (
            <option key={s.length} value={s.length}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <DayPicker
        date={date}
        onChange={(date) => {
          setDate(date);
          setPicked(null);
        }}
      />
      <TimeList date={date} times={times} picked={picked} onPick={setPicked} />
      <Summary date={date} picked={picked} service={service.name} />
      <BookingForm date={date} picked={picked} />
    </section>
  );
}

createRoot(document.querySelector("#booking")!).render(<BookingSection />);
