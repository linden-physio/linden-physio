"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../../server/auth.ts";

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
