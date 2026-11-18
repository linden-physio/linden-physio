"use server";

import { headers } from "next/headers";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { clinicHere, here } from "./business";
import { emailConfirmLink } from "../server/holds.ts";
import { addressOf, originOf } from "../server/address.ts";
import { startDeposit } from "../server/payments.ts";
import { dayName } from "./dayName";
import { clockTime } from "./clockTime";
import type { FormState } from "./Message";
import { log } from "../server/log.ts";

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
  log("info", "booking held", { booking: booked.id, business: await here(), service, start: booked.startsAt });
  if (booked.depositSek > 0) {
    // The time is held while the person pays the deposit, in the payment provider's card form. The
    // payment confirms it (see bookings/paid).
    const { name: businessName } = await clinic.about();
    const [{ title }] = (await clinic.offers()).filter((s) => s.id === service);
    let form: string;
    try {
      form = await startDeposit({
        business: await here(),
        booking: booked.id,
        amountSek: booked.depositSek,
        description: businessName + ": " + title + ", " + dayName(date) + " " + clockTime(booked.startsAt),
        back: originOf(asked) + "/bookings/paid",
      });
      log("info", "deposit asked", { booking: booked.id, depositSek: booked.depositSek });
    } catch (error) {
      log("error", "payment not started", { booking: booked.id }, error);
      await clinic.cancel(booked.id);
      return { kind: "failed", message: "We couldn't start the payment. Please try again in a while." };
    }
    updateTag("free-times");
    refresh();
    return {
      kind: "pay",
      form,
      depositSek: booked.depositSek,
      name,
      date,
      time: booked.startsAt,
      with: booked.with,
    };
  }
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
