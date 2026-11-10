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
  return (
    <>
      <p id="count">{times.length === 0 ? "No free times on " + dayName(date) : times.length + " free times"}</p>
      <ul id="free-times">
        {times.map((time) => (
          <li>
            <button className={time === picked ? "picked" : undefined} onClick={() => onPick(time)}>
              {time}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
