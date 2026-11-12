import { setupWorker } from "msw/browser";
import { alreadyStarted, handlers } from "./handlers";

// A service worker that answers the stand-in's requests inside this browser. Every other request goes on
// to the server as usual.
export const worker = setupWorker(...handlers);

// Add ?mock=started to the page's address to see the answer for a booking that has already started.
if (new URLSearchParams(location.search).get("mock") === "started") worker.use(alreadyStarted);
