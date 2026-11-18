"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { askToMove, moveOwn, type MoveState } from "./actions";
import { dayName } from "../dayName";
import { clockTime } from "../clockTime";

const day = (instant: string) =>
  dayName(instant.slice(0, 10)) +
  " " +
  new Date(instant).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" }) +
  " at " +
  clockTime(instant);

// Move a booking by saying what you'd like. What comes back is a proposal with a button: nothing moves
// until the person presses it.
export function MoveByMessage() {
  const [asked, ask, asking] = useActionState(askToMove, { kind: "idle" } as MoveState);
  const [moved, move, moving] = useActionState(moveOwn, { kind: "idle" } as MoveState);
  const proposal = asked.kind === "answered" ? asked.proposal : null;
  return (
    <section aria-labelledby="move-heading" className="flex flex-col gap-3 rounded-md border border-line-200 p-4">
      <h2 id="move-heading" className="font-semibold">
        Move a booking
      </h2>
      <form action={ask} className="flex flex-col gap-2">
        <label htmlFor="move-message" className="text-ink-600">
          Say when you'd rather come, like "Can I move Thursday to a morning next week?"
        </label>
        <textarea
          id="move-message"
          name="message"
          required
          maxLength={500}
          rows={2}
          className="rounded-md border border-line-200 bg-surface px-3 py-2"
        />
        <Button type="submit" disabled={asking} className="self-start">
          {asking ? "Looking…" : "Ask"}
        </Button>
      </form>
      <div role="status" className="flex flex-col gap-2">
        {asked.kind === "answered" && <p>{asked.reply}</p>}
        {asked.kind === "failed" && <p className="text-danger-600">{asked.message}</p>}
        {proposal && moved.kind !== "moved" && (
          <form action={move}>
            <input type="hidden" name="id" value={proposal.booking} />
            <input type="hidden" name="to" value={proposal.to} />
            <Button type="submit" disabled={moving} className="h-auto max-w-full py-2 text-left whitespace-normal">
              {moving ? "Moving…" : `Move ${proposal.service} to ${day(proposal.to)}`}
            </Button>
          </form>
        )}
        {moved.kind === "moved" && <p>{moved.message}</p>}
        {moved.kind === "failed" && <p className="text-danger-600">{moved.message}</p>}
      </div>
    </section>
  );
}
