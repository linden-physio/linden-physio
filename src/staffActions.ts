"use server";

import { headers } from "next/headers";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "../server/auth.ts";
import { clinic } from "../server/clinic.ts";
import { staffOnly } from "./session";

// Start a sign-in with Microsoft: Better Auth makes the address of Microsoft's sign-in page, with our
// app's id, where to come back to, and a random state it keeps in a cookie to check when we're back.
export async function signInWithMicrosoft() {
  const { url } = await auth().api.signInSocial({
    body: { provider: "microsoft", callbackURL: "/staff" },
    headers: await headers(),
  });
  if (!url) throw new Error("Better Auth gave no address for Microsoft's sign-in.");
  redirect(url);
}

export async function signOut() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

// Cancel a booking from the day page, for someone who rang to say they can't come.
export async function cancelVisit(data: FormData) {
  await staffOnly();
  const id = z.uuid().parse(data.get("id"));
  await clinic().cancel(id);
  updateTag("free-times");
  refresh();
}
