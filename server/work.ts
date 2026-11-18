import { db } from "./db.ts";
import { work, type Handlers } from "./jobs.ts";
import { sendReminder } from "./reminders.ts";
import { emailConfirmed } from "./confirmations.ts";
import { readReceipt, sendFile } from "./accounting.ts";
import { jobGaveUp } from "./alerts.ts";

// What each kind of job does.
export const handlers: Handlers = {
  reminder: sendReminder,
  "accounting-file": sendFile,
  "accounting-receipt": readReceipt,
  confirmed: (job) => emailConfirmed(job.business, job.payload.booking, job.payload.origin, "job-" + job.id),
};

// Do the jobs that are due now, and with until, those that come due before then.
export function workNow(until?: Date) {
  return work(db(), handlers, { until, onGaveUp: jobGaveUp });
}
