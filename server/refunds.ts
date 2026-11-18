import type { Cancelled, makeClinic } from "./clinic.ts";
import { provider } from "./payments.ts";
import { log } from "./log.ts";

// Karin's rule: cancel at least a day before, and the deposit comes back. Later than that, the clinic
// keeps it: the time can't be given to someone else so late. When the clinic cancels, it always pays
// it back.
export const REFUND_HOURS = 24;

type Refunds = (
  params: { payment_intent: string; amount: number },
  options: { idempotencyKey: string },
) => Promise<{ id: string; amount: number }>;

export type CancelledWithRefund = { cancelled: Cancelled; refundedSek: number; keptSek: number; failed: boolean };

// Cancel a booking, and pay its deposit back if the rule says so. by says who cancels: the person who
// booked (with their email address, so only their own bookings), or the clinic.
export async function cancelBooking(
  clinic: ReturnType<typeof makeClinic>,
  id: string,
  by: { person: string } | "clinic",
  now: () => Date = () => new Date(),
  // The provider's refunds; the tests give a stand-in.
  refunds: Refunds = (params, options) => provider().refunds.create(params, options),
): Promise<CancelledWithRefund> {
  // Read before cancelling: once the booking is deleted, its deposits point at no booking.
  const paid = await clinic.depositsOf(id);
  const cancelled = await clinic.cancel(id, by === "clinic" ? undefined : by.person);
  const total = (paid?.deposits ?? []).reduce((sum, d) => sum + d.amountOre, 0) / 100;
  if (cancelled !== "cancelled" || !paid) return { cancelled, refundedSek: 0, keptSek: 0, failed: false };
  const early = Date.parse(paid.startsAt) - now().getTime() >= REFUND_HOURS * 60 * 60_000;
  if (by !== "clinic" && !early) return { cancelled, refundedSek: 0, keptSek: total, failed: false };
  let failed = false;
  for (const deposit of paid.deposits) {
    try {
      // The key makes this refund one refund, however many times it's asked for: if the answer is lost
      // and we ask again, or the person presses Cancel twice, the provider answers with the first
      // refund instead of making another, or refusing because it's paid back already.
      const refund = await refunds(
        { payment_intent: deposit.paymentIntent, amount: deposit.amountOre },
        { idempotencyKey: "refund-" + deposit.paymentIntent },
      );
      await clinic.refunded(deposit.id, refund.id, refund.amount);
      log("info", "deposit paid back", { booking: id, paymentIntent: deposit.paymentIntent, refund: refund.id });
    } catch (error) {
      log(
        "error",
        "deposit not paid back: do it by hand",
        { booking: id, paymentIntent: deposit.paymentIntent },
        error,
      );
      failed = true;
    }
  }
  return { cancelled, refundedSek: failed ? 0 : total, keptSek: 0, failed };
}
