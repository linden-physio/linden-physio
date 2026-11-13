import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { businessFor } from "../server/businesses.ts";
import { db } from "../server/db.ts";

// Runs before every request for a page or the API, before anything else.
export async function proxy(request: NextRequest) {
  // Staff pages: someone with no session cookie at all is sent to sign in. This is only a first check:
  // it doesn't look the token up, so it can't tell a real session from a made-up cookie.
  if (request.nextUrl.pathname.startsWith("/staff") && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  // Which business the request is for, from the address the browser asked for: lindenphysio.com is
  // Linden Physio, thebirchhairstudio.com is Birch Hair Studio. It goes on to the pages in a header,
  // set here whatever the browser sent, so nobody can choose another business by sending it themselves.
  const headers = new Headers(request.headers);
  headers.set("x-business", await businessFor(db(), request.headers.get("host")));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything but the files Next.js builds (scripts, styles, images).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
