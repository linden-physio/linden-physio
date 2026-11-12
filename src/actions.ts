"use server";

import { refresh } from "next/cache";
import { postBooking, type Booking } from "./api";
import type { FormState } from "./Message";

// Take a booking. This function runs on our server, but the form in the browser can call it: Next.js
// gives it an address of its own, and the form posts its fields there. It even works without
// JavaScript, as a plain form post.
export async function book(previous: FormState, data: FormData): Promise<FormState> {
  const name = String(data.get("name"));
  const response = await postBooking({
    start: String(data.get("time")),
    service: String(data.get("service")),
    name,
    email: String(data.get("email")),
  });
  if (response.status === 409) {
    refresh();
    return { kind: "failed", message: "Someone just booked that time. Please pick another." };
  }
  if (!response.ok) return { kind: "failed", message: "We couldn't take your booking. Please try again." };
  const made: Booking = await response.json();
  // The free times have changed: send the page's new free times back with the answer.
  refresh();
  return { kind: "booked", id: made.id, name, date: String(data.get("date")), time: made.startsAt };
}
