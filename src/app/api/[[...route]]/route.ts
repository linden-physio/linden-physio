import { Hono } from "hono";
import { handle } from "hono/vercel";
import { revalidateTag } from "next/cache";
import { makeApp } from "../../../../server/routes.ts";
import { db } from "../../../../server/db.ts";

// The clinic's server, as it ran on its own: every address under /api goes to its routes, which answer
// with the web's own Request and Response, as Next.js does.
async function answer(request: Request) {
  const app = new Hono().basePath("/api").route("/", makeApp(db()));
  const response = await handle(app)(request);
  // A booking or a cancel changed the free times: forget the kept ones. (updateTag only works in
  // server actions; { expire: 0 } makes the next visit wait for fresh times instead of being sent the old.)
  if (request.method !== "GET" && response.ok) revalidateTag("free-times", { expire: 0 });
  return response;
}

export { answer as GET, answer as POST, answer as DELETE };
