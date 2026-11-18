import { queueFiles } from "../../../../../server/accounting.ts";
import { workNow } from "../../../../../server/work.ts";

// Vercel calls this at 01:00 UTC (vercel.json): 02:00 in Stockholm in winter, 03:00 in summer. Each
// business that takes deposits gets yesterday's file sent to the accounting system.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  // ?day=2026-11-18 sends that day's file again, by hand.
  const day = new URL(request.url).searchParams.get("day");
  const queued = await queueFiles(new Date(), day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined);
  return Response.json({ queued, ...(await workNow(new Date(Date.now() + 4 * 60_000))) });
}
