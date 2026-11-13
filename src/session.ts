import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "../server/auth.ts";
import { db } from "../server/db.ts";
import { staff } from "../server/schema.ts";

export type Staff = { id: number; name: string; email: string };

// Whoever is signed in on this request, as a member of staff, or null. Better Auth checks the session
// cookie against its session table; the address it signed in with says which member of staff it is.
// Read once for each request, however many parts of the page ask.
export const signedIn = cache(async (): Promise<Staff | null> => {
  // The headers first: they tell next build that this runs for each request, before auth() needs
  // its settings, which a build doesn't have.
  const asked = await headers();
  const session = await auth().api.getSession({ headers: asked });
  if (!session) return null;
  const [row] = await db()
    .select({ id: staff.id, name: staff.name })
    .from(staff)
    .where(eq(staff.email, session.user.email.toLowerCase()));
  // Signed in, but not (or no longer) on the staff.
  if (!row) return null;
  return { id: row.id, name: row.name, email: session.user.email };
});

// Whoever is signed in, or straight to the sign-in page. Every page and action that reads the staff's
// data calls this first, next to the data, whatever proxy.ts has let through.
export async function staffOnly(): Promise<Staff> {
  const staff = await signedIn();
  if (!staff) redirect("/sign-in");
  return staff;
}
