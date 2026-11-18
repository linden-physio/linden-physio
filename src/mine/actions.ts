"use server";

import { headers } from "next/headers";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAPIError } from "better-auth/api";
import { auth } from "../../server/auth.ts";
import { clinicHere } from "../business";
import { cancelBooking } from "../../server/refunds.ts";
import { log } from "../../server/log.ts";
import { reschedule, type Proposal } from "../../server/reschedule.ts";

export type LinkState = { kind: "idle" } | { kind: "sent"; email: string } | { kind: "invalid"; message: string };

// Email a link that signs someone in: to their bookings (/bookings), or, for the staff of a business
// that signs in by email, to the day page (/staff). Whoever owns the inbox can open it; nobody else
// learns anything, so the answer is the same whether or not there are bookings for that address.
export async function sendBookingsLink(previous: LinkState, data: FormData): Promise<LinkState> {
  const email = z.email().safeParse(data.get("email"));
  if (!email.success) return { kind: "invalid", message: "Write your email address." };
  const next = data.get("next") === "/staff" ? "/staff" : "/bookings";
  try {
    await auth().api.signInMagicLink({
      body: { email: email.data, callbackURL: next, errorCallbackURL: next === "/staff" ? "/sign-in" : "/bookings" },
      headers: await headers(),
    });
  } catch (error) {
    // Refused on purpose: a staff address (see server/auth.ts).
    if (isAPIError(error) && error.status === "FORBIDDEN") {
      return {
        kind: "invalid",
        message: "We can't send a link to that address. If you work here, sign in at /sign-in.",
      };
    }
    // Anything else: the mail couldn't be sent. Say so, and keep the reason in the server's log.
    log("error", "sign-in link not sent", {}, error);
    return { kind: "invalid", message: "We couldn't send the email just now. Please try again later, or email us." };
  }
  return { kind: "sent", email: email.data };
}

export async function forgetMe() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/bookings");
}

export type CancelState = { kind: "idle" } | { kind: "failed"; message: string };

// Cancel one of your own bookings. The action checks who is signed in itself: anyone can post to it.
export async function cancelOwn(previous: CancelState, data: FormData): Promise<CancelState> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) redirect("/bookings");
  const id = z.uuid().safeParse(data.get("id"));
  if (!id.success) return { kind: "failed", message: "We couldn't find that booking." };
  const { cancelled } = await cancelBooking(await clinicHere(), id.data, { person: session.user.email });
  if (cancelled === "started") return { kind: "failed", message: "That booking has already started. Please email us." };
  if (cancelled === "missing")
    return { kind: "failed", message: "We couldn't find that booking. It may be cancelled already." };
  // The time is free again: forget the kept free times, and send this page again without the booking.
  updateTag("free-times");
  refresh();
  return { kind: "idle" };
}

export type MoveState =
  | { kind: "idle" }
  | { kind: "answered"; reply: string; proposal: Proposal | null }
  | { kind: "moved"; message: string }
  | { kind: "failed"; message: string };

// Ask, in your own words, to move a booking: the model proposes, it doesn't move (server/reschedule.ts).
export async function askToMove(previous: MoveState, data: FormData): Promise<MoveState> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) redirect("/bookings");
  const message = z.string().trim().min(1).max(500).safeParse(data.get("message"));
  if (!message.success) return { kind: "failed", message: "Write what you'd like, in up to 500 characters." };
  try {
    const { reply, proposal } = await reschedule(await clinicHere(), session.user.email, message.data);
    return { kind: "answered", reply, proposal };
  } catch (error) {
    log("error", "reschedule failed", {}, error);
    return { kind: "failed", message: "We couldn't read your message just now. Cancel and book again, or email us." };
  }
}

// Make the move the person agreed to. It checks everything again: the form can say anything.
export async function moveOwn(previous: MoveState, data: FormData): Promise<MoveState> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) redirect("/bookings");
  const id = z.uuid().safeParse(data.get("id"));
  const to = z.iso.datetime().safeParse(data.get("to"));
  if (!id.success || !to.success) return { kind: "failed", message: "We couldn't find that booking." };
  const moved = await (await clinicHere()).move(id.data, session.user.email, to.data);
  log("info", "booking moved", { booking: id.data, outcome: moved.kind });
  if (moved.kind === "missing") return { kind: "failed", message: "We couldn't find that booking." };
  if (moved.kind === "started" || moved.kind === "passed")
    return { kind: "failed", message: "That time has passed. Please email us." };
  if (moved.kind === "taken") return { kind: "failed", message: "Someone just took that time. Ask again." };
  updateTag("free-times");
  refresh();
  return { kind: "moved", message: "Moved. You'll see it in the list above." };
}
