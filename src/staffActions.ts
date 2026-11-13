"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clinicSessions } from "../server/sessions.ts";
import { sessionCookie } from "./session";

const SignIn = z.object({ email: z.string(), password: z.string() });

export type SignInState = { message: string } | null;

// Check the address and password. If they fit, start a session and give the browser its token in a
// cookie that scripts on the page can't read (HttpOnly), that only goes over HTTPS (Secure), and that
// other sites' pages can't send along (SameSite).
export async function signIn(previous: SignInState, data: FormData): Promise<SignInState> {
  const fields = SignIn.safeParse(Object.fromEntries(data));
  if (!fields.success) return { message: "Write your address and your password." };
  const sessions = clinicSessions();
  const staff = await sessions.checkSignIn(fields.data.email, fields.data.password);
  if (!staff) return { message: "That address and password don't match." };
  const { token, expiresAt } = await sessions.start(staff.id);
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect("/staff");
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await clinicSessions().end(token);
  jar.delete(sessionCookie);
  redirect("/sign-in");
}
