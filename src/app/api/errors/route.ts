import { z } from "zod";
import { clinicHere } from "../../../business";
import { originOf } from "../../../../server/address.ts";
import { fingerprint, readStack } from "../../../../server/browserErrors.ts";
import { log } from "../../../../server/log.ts";

// Where the page reports an error from someone's browser (src/ErrorReporter.tsx). Anyone can post here,
// so the report is limited in size, read as text only, and its stack is read only against our own
// scripts.
const Report = z.object({
  message: z.string().max(1000),
  stack: z.string().max(10_000),
  page: z.string().max(1000),
  release: z.string().max(100),
});

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 16_000) return new Response(null, { status: 413 });
  let parsed;
  try {
    parsed = Report.safeParse(JSON.parse(body));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  const report = { ...parsed.data, browser: (request.headers.get("user-agent") ?? "").slice(0, 300) };
  const source = await readStack(report.stack, originOf(request.headers));
  const mistake = fingerprint(report.message, source);
  await (await clinicHere()).browserError({ ...report, source, fingerprint: mistake });
  log("warn", "browser error", { message: report.message, page: report.page, release: report.release, at: mistake });
  return new Response(null, { status: 204 });
}
