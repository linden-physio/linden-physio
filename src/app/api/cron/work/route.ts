import { workNow } from "../../../../../server/work.ts";

// Does the jobs that are due: those put back after a failure, and any that nothing has run yet.
// Called every morning (vercel.json; a Hobby plan allows a schedule only once a day), with the
// project's CRON_SECRET.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  return Response.json(await workNow());
}
