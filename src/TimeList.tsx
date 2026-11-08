import { useState } from "react";
import { dayName } from "./dayName";

export function TimeList({
  date,
  times,
  picked,
  onPick,
}: {
  date: string;
  times: string[];
  picked: string | null;
  onPick: (time: string) => void;
}) {
  const [count] = useState(times.length);
  return (
    <>
      <p id="count">{count === 0 ? "No free times on " + dayName(date) : count + " free times"}</p>
      <ul id="free-times">
        {times.map((time) => (
          <li key={time}>
            <button className={time === picked ? "picked" : undefined} onClick={() => onPick(time)}>
              {time}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
