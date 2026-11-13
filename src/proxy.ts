import { NextResponse, type NextRequest } from "next/server";

// Runs before every request for the staff's pages, before any page is made. Someone with no session
// cookie at all is sent to sign in. This is only a first check: it doesn't look the token up, so it
// can't tell a real session from a made-up cookie.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
