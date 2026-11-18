"use client";

import { useEffect } from "react";
import { reportError } from "../../reportError";

// What a page shows in place of the part that failed while React rendered it, in the browser or on the
// server. From the server, the browser gets only error.digest, an id the server's log has too: never
// the message, which might say more than a visitor should read.
export default function Failed({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-title">Something went wrong</h1>
      <p>We've been told about it. Please try again, or email us if it keeps happening.</p>
      <button type="button" onClick={reset} className="self-start rounded-md border border-line-200 px-4 py-2">
        Try again
      </button>
    </main>
  );
}
