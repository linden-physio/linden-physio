export type FormState =
  | { kind: "editing" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; name: string; email: string; date: string; time: string }
  | { kind: "sending" };

function messageFor(formState: FormState): string {
  switch (formState.kind) {
    case "editing":
      return "";
    case "invalid":
      return formState.message;
    case "ready":
      return "Ready to book " + formState.time + " for " + formState.name + ".";
    case "sending":
      return "Sending your booking…";
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
  ready: "bg-ready-100",
  sending: "bg-sending-100",
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
