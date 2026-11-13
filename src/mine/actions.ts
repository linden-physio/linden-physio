"use server";

import { headers } from "next/headers";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../../server/auth.ts";
import { clinic } from "../../server/clinic.ts";

export type LinkState = { kind: "idle" } | { kind: "sent"; email: string } | { kind: "invalid"; message: string };

// Email a link to the bookings made with an address. Whoever owns the inbox can open it; nobody else
// learns anything, so the answer is the same whether or not there are bookings for that address.
export async function sendBookingsLink(previous: LinkState, data: FormData): Promise<LinkState> {
  const email = z.email().safeParse(data.get("email"));
  if (!email.success) return { kind: "invalid", message: "Write the email address you booked with." };
  try {
    await auth().api.signInMagicLink({
      body: { email: email.data, callbackURL: "/bookings", errorCallbackURL: "/bookings" },
      headers: await headers(),
    });
  } catch {
    return { kind: "invalid", message: "We can't send a link to that address. If you work here, sign in at /sign-in." };
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
  const cancelled = await clinic().cancel(id.data, session.user.email);
  if (cancelled === "started") return { kind: "failed", message: "That booking has already started. Please email us." };
  if (cancelled === "missing")
    return { kind: "failed", message: "We couldn't find that booking. It may be cancelled already." };
  // The time is free again: forget the kept free times, and send this page again without the booking.
  updateTag("free-times");
  refresh();
  return { kind: "idle" };
}
