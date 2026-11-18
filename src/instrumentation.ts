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
