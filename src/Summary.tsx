import { dayName } from "./dayName";
import { clockTime } from "./clockTime";

export function Summary({ date, picked, service }: { date: string; picked: string | null; service: string }) {
  return (
    <p id="summary" className="text-title">
      {picked ? dayName(date) + " " + clockTime(picked) + ", " + service : "No time picked yet."}
    </p>
  );
}
