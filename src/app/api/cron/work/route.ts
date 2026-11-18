import { workNow } from "../../../../../server/work.ts";
import { checkLastNight } from "../../../../../server/alerts.ts";

// Does the jobs that are due: those put back after a failure, and any that nothing has run yet. Then
// checks that last night's file to the accounting system was booked, and sends an alert if not.
// Called every morning at 05:00 UTC (vercel.json; a Hobby plan allows a schedule only once a day),
// with the project's CRON_SECRET.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  const worked = await workNow();
  return Response.json({ ...worked, alerts: await checkLastNight() });
}
