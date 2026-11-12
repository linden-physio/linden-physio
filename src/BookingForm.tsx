"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
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
import { cancelBooking } from "./api";
import { book } from "./actions";
import { afterCancel } from "./cancelling";
import { clockTime } from "./clockTime";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// What the dialog shows, and the form's fields to send once it's confirmed.
type Details = { name: string; email: string; date: string; time: string; data: FormData };

export function BookingForm({
  date,
  picked,
  service,
  serviceId,
  onSending,
  onChanged,
}: {
  date: string;
  picked: string | null;
  service: string;
  serviceId: string;
  // Called when a booking is sent: the picked time is on its way, and gone from the free times after.
  onSending: () => void;
  // Called when the free times have changed after a cancel. (A booking changes them too, and the
  // action's answer brings the new ones with it.)
  onChanged: () => void;
}) {
  // The booking's state comes from the server action's answer; pending is true while it runs.
  const [booking, bookAction, pending] = useActionState(book, { kind: "editing" });
  // What the browser has to say itself: a time not picked yet, and cancelling.
  const [formState, setFormState] = useState<FormState>({ kind: "editing" });
  const shown: FormState = pending ? { kind: "sending" } : formState.kind !== "editing" ? formState : booking;
  // The booking being checked in the dialog, or null when the dialog is closed.
  const [checking, setChecking] = useState<Details | null>(null);
  // The confirmed booking, kept until the dialog has closed.
  const confirmed = useRef<Details | null>(null);

  // With JavaScript, check the booking in a dialog first. Without it, this never runs: the browser posts
  // the form to the action itself.
  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (picked === null) {
      setFormState({ kind: "invalid", message: "Pick a time first." });
    } else if (date < today()) {
      setFormState({ kind: "invalid", message: "That day has already passed." });
    } else {
      setFormState({ kind: "editing" });
      setChecking({ name: String(data.get("name")), email: String(data.get("email")), date, time: picked, data });
    }
  }

  function confirm() {
    confirmed.current = checking;
    setChecking(null);
  }

  // While the dialog is open, the rest of the page is hidden from screen readers, so a message
  // set then is never read. Send the booking once the dialog has closed.
  function closed() {
    if (confirmed.current) send(confirmed.current);
    confirmed.current = null;
  }

  function send(details: Details) {
    onSending();
    startTransition(() => bookAction(details.data));
  }

  async function cancel(booked: { id: string; date: string; time: string }) {
    setFormState({ kind: "cancelling" });
    try {
      const response = await cancelBooking(booked.id);
      setFormState(afterCancel(response.status, booked));
      if (response.ok) onChanged();
    } catch {
      // No answer at all: the network or the server is down.
      setFormState(afterCancel(0, booked));
    }
  }

  return (
    <form id="details" action={bookAction} onSubmit={check} className="flex flex-col gap-4">
      <input type="hidden" name="service" value={serviceId} />
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" id="name" name="name" required autoComplete="name" />
        <Field label="Email" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" className="book w-full sm:w-auto sm:self-start">
        Book
      </Button>
      <Dialog
        open={checking !== null}
        onOpenChange={(open) => !open && setChecking(null)}
        onOpenChangeComplete={(open) => !open && closed()}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Check your booking</DialogTitle>
            <DialogDescription className="text-base">
              {checking && dayName(checking.date) + " " + clockTime(checking.time) + ", " + service}
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
      <Message formState={shown} />
      {shown.kind === "booked" && (
        <Button type="button" variant="outline" className="sm:self-start" onClick={() => cancel(shown)}>
          Cancel this booking
        </Button>
      )}
    </form>
  );
}
