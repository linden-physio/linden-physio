import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form id="details" onSubmit={book} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required autoComplete="name" className="h-10 rounded-sm bg-surface" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-10 rounded-sm bg-surface" />
        </div>
      </div>
      <Button type="submit" className="book self-start">
        Book
      </Button>
      <p id="message" role="status" className={`rounded-md px-4 py-3 break-words empty:hidden bg-${formState.kind}-100`}>
        {messageFor(formState)}
      </p>
    </form>
  );
}
