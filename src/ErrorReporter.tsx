"use client";

import { useEffect } from "react";
import { reportError } from "./reportError";

// Listens for errors no code caught: an exception in an event handler, a promise nobody waited for.
// Errors while React renders go to the nearest error.tsx instead, which reports them itself.
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
