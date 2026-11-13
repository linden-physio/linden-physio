"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "../Field";
import { sendBookingsLink } from "./actions";

// Ask for a link to your bookings.
export function LinkForm() {
  const [state, action, pending] = useActionState(sendBookingsLink, { kind: "idle" });
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <Field label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <Button type="submit" disabled={pending} className="sm:self-start">
        Send me a link
      </Button>
      <div role="status">
        {state.kind === "sent" && (
          <p className="rounded-md bg-ready-100 px-4 py-3">
            We've sent a link to {state.email}. It works once, for 15 minutes.
          </p>
        )}
        {state.kind === "invalid" && (
          <p className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">{state.message}</p>
        )}
      </div>
    </form>
  );
}
