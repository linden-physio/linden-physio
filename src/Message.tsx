import { dayName } from "./dayName";
import { clockTime } from "./clockTime";

export type FormState =
  | { kind: "editing" }
  | { kind: "invalid"; message: string }
  | { kind: "sending" }
  | { kind: "held"; id: string; name: string; email: string; date: string; time: string; with: string }
  | { kind: "cancelling" }
  | { kind: "cancelled"; date: string; time: string }
  | { kind: "failed"; message: string };

function messageFor(formState: FormState): string {
  switch (formState.kind) {
    case "editing":
      return "";
    case "invalid":
      return formState.message;
    case "sending":
      return "Sending your booking…";
    case "held":
      return (
        "Held for you: " +
        dayName(formState.date) +
        " " +
        clockTime(formState.time) +
        " with " +
        formState.with +
        ", for " +
        formState.name +
        ". We've sent a link to " +
        formState.email +
        ". Open it within 15 minutes to confirm the booking, or the time goes back to the others."
      );
    case "cancelling":
      return "Cancelling your booking…";
    case "cancelled":
      return "Cancelled: " + dayName(formState.date) + " " + clockTime(formState.time) + ". The time is free again.";
    case "failed":
      return formState.message;
    default: {
      const unhandled: never = formState;
      throw new Error("Unhandled form state: " + JSON.stringify(unhandled));
    }
  }
}

// Full class names, so that Tailwind finds them when it reads this file.
const messageColour: Record<FormState["kind"], string> = {
  editing: "",
  invalid: "bg-invalid-100 text-danger-600",
  sending: "bg-sending-100",
  held: "bg-ready-100",
  cancelling: "bg-sending-100",
  cancelled: "bg-ready-100",
  failed: "bg-invalid-100 text-danger-600",
};

export function Message({ formState }: { formState: FormState }) {
  // The status stays on the page even when it's empty, so that a screen reader reads each new message.
  return (
    <div role="status">
      <p id="message" className={"rounded-md px-4 py-3 break-words empty:hidden " + messageColour[formState.kind]}>
        {messageFor(formState)}
      </p>
    </div>
  );
}
