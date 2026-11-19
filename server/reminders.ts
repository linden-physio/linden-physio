import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { businesses } from "./schema.ts";
import { sendMail } from "./mail.ts";
import { fromInstant } from "./clock.ts";
import { when } from "./confirmations.ts";
import { enqueue, type Job } from "./jobs.ts";

function tomorrow(now: Date): string {
  const today = fromInstant(now.toISOString()).date;
  const d = new Date(today + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Every evening, a job for each reminder to send: one for everyone with a booking tomorrow. The key
// makes a schedule that runs twice (Vercel's can) add each reminder once.
export async function queueReminders(now = new Date()): Promise<number> {
  const date = tomorrow(now);
  let queued = 0;
  for (const { id: business } of await db().select({ id: businesses.id }).from(businesses)) {
    for (const booking of await makeClinic(db(), business).confirmedOn(date)) {
      // A second run finds each reminder queued already: count only the new ones.
      const added = await enqueue(db(), {
        business,
        kind: "reminder",
        payload: { booking: booking.id },
        key: "reminder-" + booking.id,
      });
      if (added) queued++;
    }
  }
  return queued;
}

// One reminder, when its job comes up. A booking cancelled since gets none.
export async function sendReminder(job: Job) {
  const clinic = makeClinic(db(), job.business);
  const booking = await clinic.booking(job.payload.booking);
  if (!booking || !booking.confirmed) return;
  const { name, email } = await clinic.about();
  const line = `${booking.service} with ${booking.with}, ${when(booking.startsAt)}`;
  await sendMail(
    {
      from: name + " <" + email + ">",
      to: booking.email,
      subject: "See you tomorrow at " + name,
      text: `A reminder of your booking tomorrow:\n\n${line}\n\nCan't come? Cancel from your bookings page, or reply to this email.\n`,
      html: `<p>A reminder of your booking tomorrow:</p><p><strong>${line}</strong></p><p>Can't come? Cancel from your bookings page, or reply to this email.</p>`,
    },
    // A job can run twice: if the worker stops after sending and before marking it done. Resend sends
    // a key it has seen in the last 24 hours only once.
    "job-" + job.id,
  );
}
