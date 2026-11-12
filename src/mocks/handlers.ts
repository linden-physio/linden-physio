import { http, HttpResponse } from "msw";
import type { components } from "../api-types";

type NewBooking = components["schemas"]["NewBooking"];
type Booking = components["schemas"]["Booking"];
type Problem = components["schemas"]["Problem"];

// A stand-in for the server, for the requests it can't answer yet. Each answer is one of the contract's
// examples (the server's openapi.yaml), and the generated types check that it has the contract's shape.
export const handlers = [
  // Booking: the server doesn't send an id back yet, so answer this here too.
  http.post<never, NewBooking, Booking>("*/bookings", async ({ request }) => {
    const booking = await request.json();
    return HttpResponse.json({ id: crypto.randomUUID(), startsAt: booking.start }, { status: 201 });
  }),

  // Cancelling: the time is free again, and there is nothing to send back.
  http.delete("*/bookings/:id", () => new HttpResponse(null, { status: 204 })),
];

// The contract's other answer: the booking has already started, so it can't be cancelled.
export const alreadyStarted = http.delete<never, never, Problem>("*/bookings/:id", () =>
  HttpResponse.json({ error: "This booking has already started." }, { status: 409 }),
);
