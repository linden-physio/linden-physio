// Times as the clinic writes them, in Stockholm, on both sides.
const zone = "Europe/Stockholm";
export const clock = (instant) =>
  new Date(instant).toLocaleTimeString("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit" });
export const dayName = (date) =>
  new Date(date + "T12:00Z").toLocaleDateString("en-GB", { timeZone: zone, weekday: "long" });
