import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { businesses } from "./schema.ts";
import { sendMail } from "./mail.ts";
import { fromInstant } from "./clock.ts";
import { when } from "./confirmations.ts";

function tomorrow(now: Date): string {
  const today = fromInstant(now.toISOString()).date;
  const d = new Date(today + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Every evening, a reminder to everyone with a booking tomorrow. All at once: it's quicker.
export async function sendReminders(now = new Date()): Promise<number> {
  const date = tomorrow(now);
  let sent = 0;
  for (const { id: business } of await db().select({ id: businesses.id }).from(businesses)) {
    const clinic = makeClinic(db(), business);
    const { name, email } = await clinic.about();
    const booked = await clinic.confirmedOn(date);
    await Promise.all(
      booked.map(async (booking) => {
        const line = `${booking.service} with ${booking.with}, ${when(booking.startsAt)}`;
        await sendMail({
          from: name + " <" + email + ">",
          to: booking.email,
          subject: "See you tomorrow at " + name,
          text: `A reminder of your booking tomorrow:\n\n${line}\n\nCan't come? Cancel from your bookings page, or reply to this email.\n`,
          html: `<p>A reminder of your booking tomorrow:</p><p><strong>${line}</strong></p><p>Can't come? Cancel from your bookings page, or reply to this email.</p>`,
        });
        sent++;
      }),
    );
  }
  return sent;
}
