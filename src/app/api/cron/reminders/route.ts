import { sendReminders } from "../../../../../server/reminders.ts";

// Vercel calls this every evening (vercel.json's crons), with the project's CRON_SECRET as a bearer
// token. Anyone else could call it too, so check it.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  const sent = await sendReminders();
  return Response.json({ sent });
}
