import { registerOTel } from "@vercel/otel";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";

// Next.js calls register() once when the server starts. OpenTelemetry then times each request as a
// trace: a span for the request, and inside it a span for each database query and each fetch (to Kassa,
// to Resend), each with its start, its length and what it was. log.ts writes the trace's id on every
// log line. On Vercel the spans go to whatever the project sends them to; on this computer, to the
// address in OTEL_EXPORTER_OTLP_ENDPOINT: Jaeger, a trace viewer (compose.yaml), read at
// http://localhost:16686. With neither, the spans go nowhere and cost almost nothing.
export function register() {
  registerOTel({ serviceName: "linden-physio", instrumentations: ["auto", new PgInstrumentation()] });
}

// Next.js calls this for every error thrown while answering a request: a page, a server action, a
// route. The line carries the error's digest, the id a visitor's error page was given in its place.
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  // This file is built for the Edge runtime too, where the log can't write: Node.js only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log } = await import("../server/log.ts");
  log(
    "error",
    "request failed",
    {
      method: request.method,
      path: request.path,
      route: context.routePath,
      routeType: context.routeType,
      digest: (error as { digest?: string }).digest,
    },
    error,
  );
}
