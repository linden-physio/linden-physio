import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayName } from "./dayName";

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

// Full class names, so that Tailwind finds them when it reads this file.
const messageColour: Record<FormState["kind"], string> = {
  editing: "",
  invalid: "bg-invalid-100 text-danger-600",
  ready: "bg-ready-100",
  sending: "bg-sending-100",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Details = { name: string; email: string; date: string; time: string };

export function BookingForm({ date, picked, service }: { date: string; picked: string | null; service: string }) {
  const [formState, setFormState] = useState<FormState>({ kind: "editing" });
  // The booking being checked in the dialog, or null when the dialog is closed.
  const [checking, setChecking] = useState<Details | null>(null);

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (picked === null) {
      setFormState({ kind: "invalid", message: "Pick a time first." });
    } else if (date < today()) {
      setFormState({ kind: "invalid", message: "That day has already passed." });
    } else {
      setFormState({ kind: "editing" });
      setChecking({ name: String(data.get("name")), email: String(data.get("email")), date, time: picked });
    }
  }

  function confirm() {
    if (checking) setFormState({ kind: "ready", ...checking });
    setChecking(null);
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
      <Dialog open={checking !== null} onOpenChange={(open) => !open && setChecking(null)}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Check your booking</DialogTitle>
            <DialogDescription className="text-base">
              {checking && dayName(checking.date) + " " + checking.time + ", " + service}
            </DialogDescription>
          </DialogHeader>
          {checking && (
            <p className="break-words">
              For {checking.name}, {checking.email}
            </p>
          )}
          <DialogFooter className="-mx-6 -mb-6 p-6">
            <DialogClose render={<Button variant="outline" />}>Go back</DialogClose>
            <Button onClick={confirm}>Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p id="message" role="status" className={"rounded-md px-4 py-3 break-words empty:hidden " + messageColour[formState.kind]}>
        {messageFor(formState)}
      </p>
    </form>
  );
}
