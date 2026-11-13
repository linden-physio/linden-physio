import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../../../server/auth.ts";
import { clinicHere } from "../../../../business";

// Where the link that confirms a booking lands, after Better Auth has signed the person in by it. The
// session says whose address it is; confirm that address's holds, and show them their bookings. The
// free times stay as they are: a held time was already taken.
export async function GET() {
  // The headers first: they tell next build that this runs for each request, before auth() needs
  // its settings, which a build doesn't have.
  const asked = await headers();
  const session = await auth().api.getSession({ headers: asked });
  if (!session) redirect("/bookings");
  const confirmed = await (await clinicHere()).confirm(session.user.email);
  redirect("/bookings?confirmed=" + confirmed);
}
