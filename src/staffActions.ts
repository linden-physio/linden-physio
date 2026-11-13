"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../server/auth.ts";

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
