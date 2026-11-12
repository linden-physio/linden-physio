import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { z } from "zod";
import { BookingId, FreeTimesQuery, NewBooking } from "./schemas.ts";
import { makeClinic } from "./clinic.ts";

// A 400 answer that names each field that failed, and why.
function problems(error: z.ZodError) {
  return {
    error: "The request doesn't have the right shape.",
    problems: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}

// The server's addresses, talking to the given database, and answering the pages at the given origins.
// What each one does is in clinic.ts; here it's only HTTP: reading the request and writing the answer.
export function makeApp(db: NodePgDatabase, allowedOrigins: string[], now: () => Date = () => new Date()) {
  const clinic = makeClinic(db, now);
  const app = new Hono();
  app.use(logger());
  // Each environment names the origins it allows. A * stands for any run of letters, digits and
  // dashes, because each preview of the page gets its own address.
  const patterns = allowedOrigins.map(
    (origin) => new RegExp("^" + origin.replaceAll(".", "\\.").replaceAll("*", "[a-z0-9-]+") + "$"),
  );
  app.use(cors({ origin: (origin) => (patterns.some((pattern) => pattern.test(origin)) ? origin : null) }));

  app.get("/free-times", async (c) => {
    const query = FreeTimesQuery.safeParse(c.req.query());
    if (!query.success) return c.json(problems(query.error), 400);
    const { date, service } = query.data;
    const answer = await clinic.freeTimesOn(date, service);
    if (answer === null) return c.json({ error: "No such service: " + service }, 400);
    return c.json(answer);
  });

  app.post("/bookings", async (c) => {
    const parsed = NewBooking.safeParse(await c.req.json());
    if (!parsed.success) return c.json(problems(parsed.error), 400);
    const booked = await clinic.book(parsed.data);
    if (booked.kind === "no-service") return c.json({ error: "No such service: " + parsed.data.service }, 400);
    if (booked.kind === "taken") return c.json({ error: "That time is no longer free." }, 409);
    return c.json({ id: booked.id, startsAt: booked.startsAt }, 201);
  });

  app.delete("/bookings/:id", async (c) => {
    const id = BookingId.safeParse(c.req.param("id"));
    if (!id.success) return c.json(problems(id.error), 400);
    const cancelled = await clinic.cancel(id.data);
    if (cancelled === "cancelled") return c.body(null, 204);
    if (cancelled === "started") return c.json({ error: "This booking has already started." }, 409);
    return c.json({ error: "There is no such booking." }, 404);
  });

  return app;
}
