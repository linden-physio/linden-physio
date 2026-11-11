import type { FormState } from "./Message";

// What to tell the person once the server has answered a cancel, by the answer's status. The contract
// (the server's openapi.yaml) lists these answers.
export function afterCancel(status: number, booking: { date: string; time: string }): FormState {
  switch (status) {
    case 204:
      return { kind: "cancelled", date: booking.date, time: booking.time };
    case 404:
      return { kind: "failed", message: "We couldn't find that booking. It may be cancelled already." };
    case 409:
      return {
        kind: "failed",
        message: "This booking has already started, so it can't be cancelled. Please email us.",
      };
    default:
      return { kind: "failed", message: "We couldn't cancel your booking. Please try again." };
  }
}
