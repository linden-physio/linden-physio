import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

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

// Each day is a link to the page for that day. The server makes the links, and they need no JavaScript.
export function DayPicker({ date, service }: { date: string; service: string }) {
  const href = (day: string) => "/?day=" + day + "&service=" + service;
  const arrow = buttonVariants({ variant: "outline", size: "icon" });
  return (
    <nav aria-label="Days" className="flex items-center gap-1 sm:gap-2">
      <Link href={href(addDays(date, -7))} scroll={false} prefetch={false} aria-label="Previous week" className={arrow}>
        <ChevronLeft />
      </Link>
      <div id="day" className="grid flex-1 grid-cols-7 gap-1 sm:gap-2">
        {weekOf(date).map((day) => (
          <DayPill key={day} day={day} picked={day === date} href={href(day)} />
        ))}
      </div>
      <Link href={href(addDays(date, 7))} scroll={false} prefetch={false} aria-label="Next week" className={arrow}>
        <ChevronRight />
      </Link>
    </nav>
  );
}

function DayPill({ day, picked, href }: { day: string; picked: boolean; href: string }) {
  const d = new Date(day + "T12:00");
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-current={picked ? "date" : undefined}
      aria-label={d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      className={
        "flex flex-col items-center rounded-full border py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:text-sm " +
        (picked ? "border-brand-600 bg-brand-600 text-white" : "border-line-200 bg-surface")
      }
    >
      <span>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
      <span className="font-semibold">{d.getDate()}</span>
    </Link>
  );
}
