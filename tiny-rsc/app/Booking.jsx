"use client";

import { createContext, use, useState } from "react";
import { services } from "./services.js";
import { clock, dayName } from "./time.js";

// The time the visitor picked, for the time chips that the server makes.
const Picked = createContext(null);
export const usePicked = () => use(Picked);

// The part of the page that holds the visitor's choice. It runs in the browser.
export function Booking({ day, service, times }) {
  const [picked, setPicked] = useState(null);
  const name = services.find((s) => s.id === service).name;
  return (
    <section>
      <h2>Free times</h2>
      <Picked value={{ picked, pick: setPicked }}>{times}</Picked>
      <p className="summary">{picked ? `${dayName(day)} ${clock(picked)}, ${name}` : "Pick a time."}</p>
    </section>
  );
}
