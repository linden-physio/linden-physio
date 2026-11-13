import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { clinicSessions, type Staff } from "../server/sessions.ts";

// The cookie's name. It holds the session's token and nothing else: no name, no address.
export const sessionCookie = "session";

// Whoever is signed in on this request, or null. Read once for each request, however many parts of
// the page ask.
export const signedIn = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(sessionCookie)?.value;
  return token ? clinicSessions().find(token) : null;
});
