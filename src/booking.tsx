import { useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { freeTimes, type Booking, type OpeningHours } from "./slots.js";

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

type FormState =
  | { kind: "editing" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; name: string; email: string; date: string; time: string }
  | { kind: "sending" };

function dayName(date: string): string {
  return new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
}

function messageFor(formState: FormState): string {
  switch (formState.kind) {
    case "editing":
      return "";
    case "invalid":
      return formState.message;
    case "ready":
      return "Ready to book " + formState.time + " for " + formState.name + ".";
    case "sending":
      return "Sending your booking…";
    default: {
      const unhandled: never = formState;
      throw new Error("Unhandled form state: " + JSON.stringify(unhandled));
    }
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// The whole booking section, described from the state.
function BookingSection() {
  const [date, setDate] = useState("2026-11-10");
  const [picked, setPicked] = useState<string | null>(null);
  const [length, setLength] = useState(60);
  const [formState, setFormState] = useState<FormState>({ kind: "editing" });

  const service = services.find((s) => s.length === length)!;
  const times = freeTimes(date, length, hours, bookings);

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (picked === null) {
      setFormState({ kind: "invalid", message: "Pick a time first." });
    } else if (date < today()) {
      setFormState({ kind: "invalid", message: "That day has already passed." });
    } else {
      setFormState({
        kind: "ready",
        name: String(data.get("name")),
        email: String(data.get("email")),
        date,
        time: picked,
      });
    }
  }

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
      <label>
        Day{" "}
        <input
          type="date"
          id="day"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setPicked(null);
          }}
        />
      </label>
      <p id="count">{times.length === 0 ? "No free times on " + dayName(date) : times.length + " free times"}</p>
      <ul id="free-times">
        {times.map((time) => (
          <li key={time}>
            <button className={time === picked ? "picked" : undefined} onClick={() => setPicked(time)}>
              {time}
            </button>
          </li>
        ))}
      </ul>
      <p id="summary">{picked ? dayName(date) + " " + picked + ", " + service.name : "No time picked yet."}</p>
      <form id="details" onSubmit={book}>
        <label>
          Your name <input name="name" required autoComplete="name" />
        </label>
        <label>
          Email <input name="email" type="email" required autoComplete="email" />
        </label>
        <button className="book">Book</button>
        <p id="message" role="status">
          {messageFor(formState)}
        </p>
      </form>
    </section>
  );
}

createRoot(document.querySelector("#booking")!).render(<BookingSection />);
