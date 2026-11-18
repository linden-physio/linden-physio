import { AsyncLocalStorage } from "node:async_hooks";
import { context as otelContext, propagation, trace } from "@opentelemetry/api";

// What happened, one line of JSON for each thing: when, how bad, what, and the ids that tie it to the
// rest. A person can't read a million lines, but a program can pick out every line about one booking:
//   npm start | grep '"booking":"8f3c…"'    or, on Vercel, the Logs page's search.
// Never an email address, a name or a card number: logs are kept, copied and read by people who may not
// see those. The booking's id is enough to look the rest up.

type Fields = Record<string, string | number | boolean | null | undefined>;

const around = new AsyncLocalStorage<Fields>();

// Everything logged while work runs carries these fields too, like the job's id, without each line
// having to say it. Each field also goes on the trace's current span, so a trace can be found by it.
export function about<T>(fields: Fields, work: () => T): T {
  trace.getActiveSpan()?.setAttributes(spanFields(fields));
  return around.run({ ...around.getStore(), ...fields }, work);
}

function spanFields(fields: Fields) {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string | number | boolean] => entry[1] != null),
  );
}

// error, when there is one, is written with its message and stack.
export function log(level: "info" | "warn" | "error", event: string, fields: Fields = {}, error?: unknown) {
  // The trace this line belongs to, when OpenTelemetry is on (instrumentation.ts): the same id the
  // trace viewer shows, so a line leads to the trace and the trace to its lines.
  const span = trace.getActiveSpan();
  span?.setAttributes(spanFields(fields));
  if (error) span?.recordException(error instanceof Error ? error : String(error));
  const line = {
    ...around.getStore(),
    ...fields,
    time: new Date().toISOString(),
    level,
    event,
    ...(span ? { trace: span.spanContext().traceId } : {}),
    ...(error ? { error: error instanceof Error ? error.message : String(error), stack: (error as Error).stack } : {}),
  };
  (level === "error" ? process.stderr : process.stdout).write(JSON.stringify(line) + "\n");
}

// The current trace, written down to go with a job (the "traceparent" header's format), so the work a
// request leaves for later shows up in the same trace when it's done.
export function traceparent(): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(otelContext.active(), carrier);
  return carrier.traceparent;
}

// Run work in a span that continues the trace written down by traceparent().
export function continuing<T>(name: string, parent: string | undefined, work: () => Promise<T>): Promise<T> {
  const from = parent ? propagation.extract(otelContext.active(), { traceparent: parent }) : otelContext.active();
  return trace.getTracer("linden-physio").startActiveSpan(name, {}, from, async (span) => {
    try {
      return await work();
    } finally {
      span.end();
    }
  });
}
