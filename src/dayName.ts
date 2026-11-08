export function dayName(date: string): string {
  return new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
}
