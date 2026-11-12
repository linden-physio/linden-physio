"use client";

import dynamic from "next/dynamic";

// The whole booking app, as it was under Vite: rendered only in the browser, not on the server (ssr: false).
const App = dynamic(() => import("../booking"), { ssr: false });

export function ClientOnly() {
  return <App />;
}
