import { useRef, useState, type FormEvent } from "react";
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
import { postBooking } from "./api";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Details = { name: string; email: string; date: string; time: string };

export function BookingForm({
  date,
  picked,
  service,
  serviceId,
  onBooked,
}: {
  date: string;
  picked: string | null;
  service: string;
  serviceId: string;
  // Called when the free times have changed: after a booking, or when someone else got there first.
  onBooked: () => void;
}) {
  const [formState, setFormState] = useState<FormState>({ kind: "editing" });
  // The booking being checked in the dialog, or null when the dialog is closed.
  const [checking, setChecking] = useState<Details | null>(null);
  // The confirmed booking, kept until the dialog has closed.
  const confirmed = useRef<Details | null>(null);

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
    confirmed.current = checking;
    setChecking(null);
  }

  // While the dialog is open, the rest of the page is hidden from screen readers, so a message
  // set then is never read. Send the booking once the dialog has closed.
  function closed() {
    if (confirmed.current) send(confirmed.current);
    confirmed.current = null;
  }

  async function send(details: Details) {
    setFormState({ kind: "sending" });
    const response = await postBooking({ ...details, service: serviceId });
    if (response.ok) {
      setFormState({ kind: "booked", name: details.name, date: details.date, time: details.time });
      onBooked();
    } else if (response.status === 409) {
      setFormState({ kind: "failed", message: "Someone just booked that time. Please pick another." });
      onBooked();
    } else {
      setFormState({ kind: "failed", message: "We couldn't take your booking. Please try again." });
    }
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
      <Dialog
        open={checking !== null}
        onOpenChange={(open) => !open && setChecking(null)}
        onOpenChangeComplete={(open) => !open && closed()}
      >
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
