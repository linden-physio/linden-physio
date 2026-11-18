import { after } from "next/server";
import { kassaEvent } from "../../../../../server/webhook.ts";
import { workNow } from "../../../../../server/work.ts";

// Kassa calls this address when something happens to a payment: for the first time, another system
// calls us. It's public, so the signature says whether it's really Kassa.
export async function POST(request: Request) {
  const { status, body } = await kassaEvent(await request.text(), request.headers.get("kassa-signature"));
  // The email it queued is sent after the answer has gone: Kassa doesn't wait for it.
  after(() => workNow());
  return Response.json(body, { status });
}
