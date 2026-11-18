import { kassaEvent } from "../../../../../server/webhook.ts";

// Kassa calls this address when something happens to a payment: for the first time, another system
// calls us. It's public, so the signature says whether it's really Kassa.
export async function POST(request: Request) {
  const { status, body } = await kassaEvent(await request.text(), request.headers.get("kassa-signature"));
  return Response.json(body, { status });
}
