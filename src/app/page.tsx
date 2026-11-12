import { ClientOnly } from "./client";

// The page at /. A folder under app/ with a page.tsx in it would be a page at that folder's path.
export default function Page() {
  return <ClientOnly />;
}
