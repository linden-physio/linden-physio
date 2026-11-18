import { SourceMapConsumer, type RawSourceMap } from "source-map-js";

// Errors from people's browsers, built small: what Sentry, Bugsnag or Datadog do for teams, with
// grouping, alerts and much more. The page reports an error (src/ErrorReporter.tsx); the server reads
// its stack back to our own files and keeps it.

export type Report = { message: string; stack: string; page: string; release: string; browser: string };

// The browser's stack points into the built scripts, one long minified line each:
//   at a (http://localhost:5173/_next/static/chunks/0f3c….js:1:20431)
// The build writes, next to each script, a source map (next.config.ts, productionBrowserSourceMaps):
// for each place in the built script, the file, line and column it came from. Read through it, the
// frame is src/BookingForm.tsx:41:11 again.
const FRAME = /(https?:\/\/[^\s)]+?\/_next\/static\/[^\s)]+?\.js):(\d+):(\d+)/g;

export async function readStack(stack: string, origin: string): Promise<string | null> {
  const maps = new Map<string, SourceMapConsumer | null>();
  let found = false;
  const lines = [];
  for (const line of stack.split("\n").slice(0, 30)) {
    const frames = [...line.matchAll(FRAME)];
    if (frames.length === 0) {
      lines.push(line);
      continue;
    }
    let read = line;
    for (const [whole, script, row, column] of frames) {
      // Only our own scripts, from our own address: a report can say anything.
      if (new URL(script).origin !== new URL(origin).origin) continue;
      if (!maps.has(script)) maps.set(script, await mapOf(origin + new URL(script).pathname));
      const map = maps.get(script);
      const at = map?.originalPositionFor({ line: Number(row), column: Number(column) - 1 });
      if (at?.source) {
        found = true;
        const file = at.source.replace(/^.*?\/(src|server|node_modules)\//, "$1/");
        // The minified function's name ("n", "w") means nothing: keep only the place.
        read = read.replace(/at \S+ \(/, "at (").replace(whole, `${file}:${at.line}:${(at.column ?? 0) + 1}`);
      }
    }
    lines.push(read);
  }
  return found ? lines.join("\n") : null;
}

// The script's last line names its map: //# sourceMappingURL=04341i_z1tb4y.js.map
async function mapOf(script: string): Promise<SourceMapConsumer | null> {
  try {
    const code = await fetch(script);
    if (!code.ok) return null;
    const name = /\/\/# sourceMappingURL=(\S+)\s*$/.exec(await code.text())?.[1];
    if (!name) return null;
    const answer = await fetch(new URL(name, script));
    if (!answer.ok) return null;
    return new SourceMapConsumer((await answer.json()) as RawSourceMap);
  } catch {
    return null;
  }
}

// One mistake, however many times and wherever it's reported: its message without the numbers and ids
// that change from time to time, and the first of our own lines it happened at (or, with none, the
// first line).
export function fingerprint(message: string, readStack: string | null): string {
  const general = message.replace(/[0-9a-f]{8,}|\d+/gi, "#");
  const ours = (readStack ?? "").split("\n").find((line) => /\(src\/|\(server\//.test(line));
  const first = ours ?? (readStack ?? "").split("\n").find((line) => /^\s*at /.test(line));
  return general + " @ " + (first?.trim().replace(/^at \(?|\)$/g, "") ?? "unknown");
}
