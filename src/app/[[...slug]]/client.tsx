"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("../../booking"), { ssr: false });

export function ClientOnly() {
  return <App />;
}
