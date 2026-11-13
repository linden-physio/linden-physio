// Who may do what at the clinic, in one place. Every server action and route that changes or shows
// something only some staff may see asks here first, on the server: hiding a button in the page
// stops nobody, since anyone can post to the action behind it.

export type Who = { id: number; role: string };

export type Action =
  // What the day's bookings are worth.
  | { do: "see the takings" }
  // Cancel a booking with a physiotherapist.
  | { do: "cancel"; staffId: number };

export function may(who: Who, action: Action): boolean {
  if (who.role === "owner") return true;
  switch (action.do) {
    case "see the takings":
      return false;
    case "cancel":
      // A physio may cancel their own patients' bookings.
      return who.role === "physio" && action.staffId === who.id;
  }
}
