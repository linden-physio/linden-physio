import { dayName } from "./dayName";

export function Summary({ date, picked, service }: { date: string; picked: string | null; service: string }) {
  return <p id="summary">{picked ? dayName(date) + " " + picked + ", " + service : "No time picked yet."}</p>;
}
