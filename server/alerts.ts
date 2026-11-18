import { and, eq, gt, sql } from "drizzle-orm";
import { alerts, businesses, exports, services } from "./schema.ts";
import { db } from "./db.ts";
import { sendMail } from "./mail.ts";
import { log } from "./log.ts";
import { yesterday } from "./accounting.ts";
import type { Job } from "./jobs.ts";

// When something has gone wrong that a person must put right, tell one: a mail to the business's own
// address (hello@lindenphysio.com), which people read. A log line nobody looks at tells nobody. What
// PagerDuty, Opsgenie or Better Stack do for teams, with rotas, phone calls and escalation.

const RUNBOOK = "https://github.com/linden-physio/linden-physio/blob/main/docs/runbook.md";

// Send an alert once: key names the trouble, like "file-2026-11-18", and the same key again sends
// nothing. Returns whether it was sent.
export async function alert(business: string, key: string, subject: string, text: string): Promise<boolean> {
  const [first] = await db()
    .insert(alerts)
    .values({ businessId: business, key, subject })
    .onConflictDoNothing()
    .returning({ id: alerts.id });
  if (!first) return false;
  const [{ name, email }] = await db().select().from(businesses).where(eq(businesses.id, business));
  log("error", "alert", { business, key, subject });
  try {
    await sendMail({
      from: name + " booking <" + email + ">",
      to: email,
      subject: "Alert: " + subject,
      text: text + "\n\nWhat to do: " + RUNBOOK + "\n",
      html: `<p>${escape(text).replaceAll("\n", "<br>")}</p><p>What to do: <a href="${RUNBOOK}">the runbook</a></p>`,
    });
  } catch (error) {
    // The alert couldn't go: forget it, so the next check tries again.
    await db().delete(alerts).where(eq(alerts.id, first.id));
    throw error;
  }
  return true;
}

const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// A job has failed for the last time: it won't be tried again unless a person does something.
export async function jobGaveUp(job: Job, error: unknown) {
  await alert(
    job.business,
    "job-" + job.id,
    `a ${job.kind} job failed for good`,
    `Job ${job.id} (${job.kind}) failed every time it was tried, and won't be tried again.\n\n` +
      `The last error: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `What it was for: ${JSON.stringify(job.payload)}`,
  );
}

// Each morning: was last night's file to the accounting system booked? This checks for the success,
// not for a failure, so it also finds the nights when nothing ran at all and no error was written
// anywhere.
export async function checkLastNight(now = new Date()) {
  const day = yesterday(now);
  const taking = await db()
    .selectDistinct({ id: businesses.id })
    .from(businesses)
    .innerJoin(services, and(eq(services.businessId, businesses.id), gt(services.depositSek, 0)));
  let sent = 0;
  for (const { id } of taking) {
    const [file] = await db()
      .select()
      .from(exports)
      .where(and(eq(exports.businessId, id), eq(exports.day, day)));
    if (file?.status === "accepted") continue;
    // The night's latest try at sending it, which may have failed before the file was ever sent.
    const { rows } = await db().execute<{ last_error: string | null; attempts: number; done: boolean }>(sql`
      SELECT last_error, attempts, done_at IS NOT NULL AS done FROM jobs
      WHERE business_id = ${id} AND kind = 'accounting-file' AND payload->>'day' = ${day}
      ORDER BY id DESC LIMIT 1`);
    const job = rows[0];
    const why =
      job && !job.done && job.last_error
        ? `It couldn't be sent: it failed ${job.attempts} times. The last error: ${job.last_error}`
        : !file
          ? "It wasn't sent, and no job to send it ran: was the 01:00 schedule called?"
          : file.status === "rejected"
            ? `The accounting system rejected it: ${file.receipt}`
            : "It was sent, and the accounting system hasn't answered.";
    if (await fileAlert(id, day, why)) sent++;
  }
  return sent;
}

// One alert for a night's file, whoever finds the trouble first: the receipt, or the morning's check.
export function fileAlert(business: string, day: string, why: string) {
  return alert(
    business,
    "file-" + day,
    `the accounting file for ${day} isn't booked`,
    `The file to the accounting system for ${day} isn't booked. ${why}\n\n` +
      `Until it is, the accountant's books are missing that day's deposits and refunds.`,
  );
}
