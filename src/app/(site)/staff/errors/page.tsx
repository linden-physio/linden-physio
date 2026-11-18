import { Suspense } from "react";
import { redirect } from "next/navigation";
import { clinicHere } from "../../../../business";
import { staffOnly } from "../../../../session";
import { may } from "../../../../../server/permissions.ts";

export const metadata = { title: "Errors" };

// The errors from people's browsers in the last week, one row for each mistake, the most frequent first.
export default function ErrorsPage() {
  return (
    <Suspense fallback={<p className="text-ink-600">Loading the errors…</p>}>
      <Errors />
    </Suspense>
  );
}

const when = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Stockholm",
});

async function Errors() {
  const who = await staffOnly();
  if (!may(who, { do: "see the errors" })) redirect("/staff");
  const errors = await (await clinicHere()).recentBrowserErrors();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title">Errors in people's browsers</h1>
      {errors.length === 0 && <p className="text-ink-600">None in the last week.</p>}
      <ul className="flex flex-col gap-4">
        {errors.map((error) => (
          <li key={error.fingerprint} className="rounded-md border border-line-200 p-4">
            <p className="font-semibold">{error.message}</p>
            <p className="text-small text-ink-600">
              {error.times} {error.times === 1 ? "time" : "times"} in {error.browsers}{" "}
              {error.browsers === 1 ? "browser" : "browsers"}, last {when.format(new Date(error.last))}, on {error.page}
              , build {error.release}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-small">Where</summary>
              <pre className="mt-2 overflow-x-auto text-small">{error.source ?? error.stack}</pre>
              {error.source && (
                <pre className="mt-2 overflow-x-auto text-small text-ink-600">
                  As the browser gave it: {error.stack}
                </pre>
              )}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
