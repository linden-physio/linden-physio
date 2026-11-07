export type OpeningHours = { open: string; close: string } | "closed";
export type Booking = { date: string; start: string; end: string };

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function toTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return h + ":" + m;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// A visit blocks the rest of its half hour, so the next one starts on the grid.
function blockedUntil(start: number, length: number): number {
  return Math.ceil((start + length) / 30) * 30;
}

// Free start times on one day, for a visit of the given length.
export function freeTimes(
  date: string,
  length: number,
  hours: Record<number, OpeningHours>,
  bookings: Booking[],
): string[] {
  const weekday = new Date(date + "T12:00").getDay();
  const open = hours[weekday];
  if (open === "closed") return [];
  const taken = bookings.filter((b) => b.date === date);
  const times = [];
  for (let start = toMinutes(open.open); blockedUntil(start, length) <= toMinutes(open.close); start += 30) {
    const end = blockedUntil(start, length);
    const clash = taken.some((b) => overlaps(start, end, toMinutes(b.start), toMinutes(b.end)));
    if (!clash) times.push(toTime(start));
  }
  return times;
}
