// The time on the clock at an instant, like "09:00".
export function clockTime(instant: string): string {
  return new Date(instant).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
