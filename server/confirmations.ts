import { makeClinic } from "./clinic.ts";
import { db } from "./db.ts";
import { sendMail } from "./mail.ts";

// "Thursday 19 November, 09:00" on the clinic's clock.
export function when(instant: string): string {
  return new Date(instant).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

// Tell the person their booking is confirmed, once its deposit is paid. origin is the business's
// address, like https://lindenphysio.com, for the link to their bookings.
// idempotencyKey: see sendMail.
export async function emailConfirmed(business: string, id: string, origin: string, idempotencyKey?: string) {
  const clinic = makeClinic(db(), business);
  const booking = await clinic.booking(id);
  if (!booking) return;
  const { name, email } = await clinic.about();
  const line = `${booking.service} with ${booking.with}, ${when(booking.startsAt)}`;
  await sendMail(
    {
      from: name + " <" + email + ">",
      to: booking.email,
      subject: "Your booking at " + name + " is confirmed",
      text: `Thank you: we have your ${booking.depositSek} kr deposit, and your booking is confirmed.\n\n${line}\n\nSee or cancel your bookings at ${origin}/bookings\n`,
      html: `<p>Thank you: we have your ${booking.depositSek} kr deposit, and your booking is confirmed.</p><p><strong>${line}</strong></p><p><a href="${origin}/bookings">See or cancel your bookings</a></p>`,
    },
    idempotencyKey,
  );
}
