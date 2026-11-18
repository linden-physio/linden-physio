import { draftMode, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";

// The editor's Preview button comes here. For someone signed in to the editor, it turns on Next's draft
// mode (a cookie) and opens the booking page with the newest saved words, not only the published ones.
// /preview?off turns it off again.
export async function GET(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect("/sign-in");
  const mode = await draftMode();
  if (new URL(request.url).searchParams.has("off")) mode.disable();
  else mode.enable();
  redirect("/");
}
