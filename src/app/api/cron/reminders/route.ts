import { queueReminders } from "../../../../../server/reminders.ts";
import { workNow } from "../../../../../server/work.ts";

// Vercel calls this every evening (vercel.json's crons), with the project's CRON_SECRET as a bearer
// token. Anyone else could call it too, so check it.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  const queued = await queueReminders();
  // Then send them, five a second. What fails goes back in the table with a later time: keep at it for
  // four minutes (a function may run for five), and the morning's run takes what's left.
  return Response.json({ queued, ...(await workNow(new Date(Date.now() + 4 * 60_000))) });
}
