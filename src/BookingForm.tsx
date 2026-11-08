import { useState, type FormEvent } from "react";

type FormState =
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingForm({ date, picked }: { date: string; picked: string | null }) {
  const [formState, setFormState] = useState<FormState>({ kind: "editing" });

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (picked === null) {
      setFormState({ kind: "invalid", message: "Pick a time first." });
    } else if (date < today()) {
      setFormState({ kind: "invalid", message: "That day has already passed." });
    } else {
      setFormState({
        kind: "ready",
        name: String(data.get("name")),
        email: String(data.get("email")),
        date,
        time: picked,
      });
    }
  }

  return (
    <form id="details" onSubmit={book}>
      <label>
        Your name <input name="name" required autoComplete="name" />
      </label>
      <label>
        Email <input name="email" type="email" required autoComplete="email" />
      </label>
      <button className="book">Book</button>
      <p id="message" role="status">
        {messageFor(formState)}
      </p>
    </form>
  );
}
