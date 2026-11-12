import { z } from "zod";
import type { components } from "./api-types";

// The clinic's server. It works out the free times and takes bookings. Its address differs between
// this computer and production, so it comes from .env.development or .env.production. Next.js writes
// every NEXT_PUBLIC_ variable into the JavaScript that visitors download, so only public values go there.
const api = process.env.NEXT_PUBLIC_API_URL;

// What the server sends for a day's free times, checked when it arrives. Each free time is an
// instant, like "2026-11-10T08:00:00.000Z". Strict objects, so that a field we don't expect is an
// error too: it usually means the server changed.
const FreeTimes = z.strictObject({
  closed: z.boolean(),
  times: z.array(z.strictObject({ startsAt: z.iso.datetime() })),
  nearest: z.strictObject({ date: z.iso.date(), startsAt: z.iso.datetime() }).nullable(),
});
export type FreeTimes = z.infer<typeof FreeTimes>;

// Ask the server for something and read the answer as JSON. A 404 or a 500 is still an answer, so check it.
async function getJSON(path: string, signal?: AbortSignal) {
  const response = await fetch(api + path, { signal });
  if (!response.ok) throw new Error(path + " answered " + response.status);
  return response.json();
}

export async function getFreeTimes(date: string, service: string, signal?: AbortSignal): Promise<FreeTimes> {
  return FreeTimes.parse(await getJSON("/free-times?date=" + date + "&service=" + service, signal));
}

// The types the contract describes, generated from the server's openapi.yaml (npm run api-types).
export type NewBooking = components["schemas"]["NewBooking"];
export type Booking = components["schemas"]["Booking"];

// Send a booking. The server answers 201 and the booking's id when it has taken it.
export function postBooking(booking: NewBooking): Promise<Response> {
  return fetch(api + "/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
}

// Cancel a booking. The server answers 204 when it's cancelled (the contract lists the other answers).
export function cancelBooking(id: string): Promise<Response> {
  return fetch(api + "/bookings/" + id, { method: "DELETE" });
}
