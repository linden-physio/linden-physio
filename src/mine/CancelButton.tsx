"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cancelOwn } from "./actions";

// Cancel one booking on the page of your own bookings.
export function CancelButton({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState(cancelOwn, { kind: "idle" });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" disabled={pending} aria-label={"Cancel " + label} className="self-start">
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      <div role="status">{state.kind === "failed" && <p className="text-danger-600">{state.message}</p>}</div>
    </form>
  );
}
