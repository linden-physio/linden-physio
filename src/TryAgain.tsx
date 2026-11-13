"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Ask the server for this page again.
export function TryAgain() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.refresh()}>
      Try again
    </Button>
  );
}
