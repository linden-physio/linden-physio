import { Hono } from "hono";
import { handle } from "hono/vercel";
import { makeApp } from "../../../../server/routes.ts";
import { db } from "../../../../server/db.ts";

// The clinic's server, as it ran on its own: every address under /api goes to its routes, which answer
// with the web's own Request and Response, as Next.js does.
function answer(request: Request) {
  const app = new Hono().basePath("/api").route("/", makeApp(db()));
  return handle(app)(request);
}

export { answer as GET, answer as POST, answer as DELETE };
