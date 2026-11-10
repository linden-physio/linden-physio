import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
import { Field } from "./Field";
import { Message, type FormState } from "./Message";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" id="name" name="name" required autoComplete="name" />
        <Field label="Email" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" className="book w-full sm:w-auto sm:self-start">
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
      <Message formState={formState} />
    </form>
  );
}
