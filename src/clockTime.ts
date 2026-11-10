// The clinic's clock, wherever the visitor is.
const clinicClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Stockholm",
});

// The time on the clinic's clock at an instant, like "09:00".
export function clockTime(instant: string): string {
  return clinicClock.format(new Date(instant));
}
