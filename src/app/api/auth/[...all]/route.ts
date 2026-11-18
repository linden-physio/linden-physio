import { auth } from "../../../../../server/auth.ts";

// Better Auth's own addresses, under /api/auth: the start of a sign-in, Microsoft's way back to us
// (/api/auth/callback/microsoft), signing out.
const answer = (request: Request) => auth().handler(request);

export { answer as GET, answer as POST };
