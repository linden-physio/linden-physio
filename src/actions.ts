"use server";

import { headers } from "next/headers";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { clinicHere } from "./business";
import { emailConfirmLink } from "../server/holds.ts";
import { addressOf } from "../server/address.ts";
import type { FormState } from "./Message";

// What a booking form must hold. The checks in the browser can be skipped: anyone can post to the
// action's address with any fields, so the action checks everything again.
const BookingFields = z.object({
  time: z.iso.datetime({ error: "Pick a time first." }).refine((time) => Date.parse(time) > Date.now(), {
    error: "That time has already passed.",
  }),
  service: z.string().min(1, { error: "Pick a service." }),
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
  const clinic = await clinicHere();
  const asked = await headers();
  const booked = await clinic.book({ start: time, service, name, email }, addressOf(asked));
  if (booked.kind === "taken") {
    updateTag("free-times");
    refresh();
    return { kind: "failed", message: "Someone just booked that time. Please pick another." };
  }
  if (booked.kind === "passed") return { kind: "invalid", message: "That time has already passed." };
  if (booked.kind === "no-service") return { kind: "invalid", message: "Pick a service." };
  if (booked.kind === "too-many") {
    return {
      kind: "failed",
      message:
        booked.per === "email"
          ? "You have bookings waiting to be confirmed. Open the links we emailed you first, or try again in a while."
          : "Too many bookings have come from your internet connection in the last hour. Please try again later, or email us.",
    };
  }
  if (booked.kind !== "held") return { kind: "failed", message: "We couldn't take your booking. Please try again." };
  // The time is held. It's the person's once they open the link we email them, which shows that the
  // address is theirs.
  if (!(await emailConfirmLink(email, asked))) {
    await clinic.cancel(booked.id);
    return { kind: "failed", message: "We couldn't send the email to confirm your booking. Please try again later." };
  }
  // The free times have changed: forget the kept ones, and send the page's new free times back with the
  // answer. updateTag makes the next request wait for fresh times, so this answer has them.
  updateTag("free-times");
  refresh();
  // When more than one physiotherapist was free, the person couldn't choose, so say who it is with.
  return { kind: "held", id: booked.id, name, email, date, time: booked.startsAt, with: booked.with };
}
