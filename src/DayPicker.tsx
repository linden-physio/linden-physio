import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// The seven days, Monday to Sunday, of the week that holds the date.
function weekOf(date: string): string[] {
  const weekday = new Date(date + "T12:00").getDay();
  const monday = addDays(date, weekday === 0 ? -6 : 1 - weekday);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
}

export function DayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="outline" size="icon" onClick={() => onChange(addDays(date, -7))}>
        <ChevronLeft />
      </Button>
      <div id="day" className="grid flex-1 grid-cols-7 gap-1 sm:gap-2">
        {weekOf(date).map((day) => (
          <DayPill key={day} day={day} picked={day === date} onPick={() => onChange(day)} />
        ))}
      </div>
      <Button variant="outline" size="icon" onClick={() => onChange(addDays(date, 7))}>
        <ChevronRight />
      </Button>
    </div>
  );
}

function DayPill({ day, picked, onPick }: { day: string; picked: boolean; onPick: () => void }) {
  const d = new Date(day + "T12:00");
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className={
        "flex flex-col items-center rounded-full border py-2 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 " +
        (picked ? "border-brand-600 bg-brand-600 text-white" : "border-line-200 bg-surface")
      }
    >
      <span>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
      <span className="font-semibold">{d.getDate()}</span>
    </button>
  );
}
