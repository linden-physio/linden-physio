"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { clinic } from "../server/clinic.ts";
import { services } from "./services";
import type { FormState } from "./Message";

// What a booking form must hold. The checks in the browser can be skipped: anyone can post to the
// action's address with any fields, so the action checks everything again.
const BookingFields = z.object({
  time: z.iso.datetime({ error: "Pick a time first." }).refine((time) => Date.parse(time) > Date.now(), {
    error: "That time has already passed.",
  }),
  service: z.string().refine((id) => services.some((s) => s.id === id), { error: "Pick a service." }),
  date: z.iso.date(),
  name: z.string().trim().min(1, { error: "Write your name." }),
  email: z.email({ error: "Write an email address we can reach you at." }),
});

// Take a booking. This function runs on our server, but the form in the browser can call it: Next.js
// gives it an address of its own, and the form posts its fields there. It even works without
// JavaScript, as a plain form post.
export async function book(previous: FormState, data: FormData): Promise<FormState> {
  const fields = BookingFields.safeParse(Object.fromEntries(data));
  if (!fields.success) return { kind: "invalid", message: fields.error.issues[0].message };
  const { time, service, date, name, email } = fields.data;
  const booked = await clinic().book({ start: time, service, name, email });
  if (booked.kind === "taken") {
    refresh();
    return { kind: "failed", message: "Someone just booked that time. Please pick another." };
  }
  if (booked.kind !== "booked") return { kind: "failed", message: "We couldn't take your booking. Please try again." };
  // The free times have changed: send the page's new free times back with the answer.
  refresh();
  return { kind: "booked", id: booked.id, name, date, time: booked.startsAt };
}
