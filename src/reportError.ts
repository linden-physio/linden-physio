// Tell the server about an error in this browser (src/app/api/errors/route.ts). sendBeacon sends it
// even while the page is closing, and doesn't wait for an answer. Offline, it would be lost: keep it
// until the browser is back online. At most five from one page, so one error in a loop doesn't send
// thousands.
let sent = 0;
const waiting: string[] = [];

export function reportError(error: unknown) {
  if (sent >= 5) return;
  sent++;
  const known = error instanceof Error ? error : new Error(String(error));
  const report = JSON.stringify({
    message: known.message.slice(0, 1000),
    stack: (known.stack ?? "").slice(0, 10_000),
    page: location.pathname,
    release: process.env.NEXT_PUBLIC_RELEASE ?? "unknown",
  });
  if (navigator.onLine) {
    navigator.sendBeacon("/api/errors", report);
    return;
  }
  if (waiting.push(report) === 1) {
    window.addEventListener(
      "online",
      () => {
        for (const later of waiting.splice(0)) navigator.sendBeacon("/api/errors", later);
      },
      { once: true },
    );
  }
}
