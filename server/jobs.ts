import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { jobs } from "./schema.ts";

// A job queue on one Postgres table (jobs, in schema.ts), by hand: what pg-boss, Graphile Worker,
// Inngest or Vercel Queues give teams ready-made, with dashboards and more.

export type Job = { id: number; business: string; kind: string; payload: Record<string, string>; attempts: number };
export type Handlers = Record<string, (job: Job) => Promise<void>>;

// After this many failed tries a job stays undone, with its last error, for a person to look at.
export const MAX_ATTEMPTS = 8;

// Add a job. key makes the same work asked for twice one job: the second is ignored. tx may be a
// transaction, so the job is saved with the work that asked for it, or not at all. Says whether this
// call added it.
export async function enqueue(
  tx: Pick<NodePgDatabase, "insert">,
  job: { business: string; kind: string; payload: Record<string, string>; key?: string; runAt?: Date },
): Promise<boolean> {
  const added = await tx
    .insert(jobs)
    .values({
      businessId: job.business,
      kind: job.kind,
      payload: job.payload,
      key: job.key,
      runAt: (job.runAt ?? new Date()).toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: jobs.id });
  return added.length > 0;
}

// How long to wait before trying a failed job again: 30 seconds, then a minute, two, four…
export function backoff(attempts: number): number {
  return 30_000 * 2 ** (attempts - 1);
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Do the jobs that are due, one at a time, at most perSecond a second (the email provider's limit, with
// room to spare), until there are none or max are done. With until, keep waiting for the jobs that come
// due before then (those put back after a failure), as a schedule that runs only once a day must. Each job is taken in a transaction with
// FOR UPDATE SKIP LOCKED: two workers running at once never take the same row, and neither waits for
// the other. If the worker dies halfway, the transaction is rolled back, and the job is due again.
export async function work(
  db: NodePgDatabase,
  handlers: Handlers,
  {
    max = 200,
    perSecond = 5,
    now = () => new Date(),
    until,
  }: { max?: number; perSecond?: number; now?: () => Date; until?: Date } = {},
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (let i = 0; i < max; i++) {
    const started = Date.now();
    const outcome = await db.transaction(async (tx) => {
      const { rows } = await tx.execute<{
        id: number;
        business_id: string;
        kind: string;
        payload: Record<string, string>;
        attempts: number;
      }>(sql`
        SELECT id, business_id, kind, payload, attempts FROM jobs
        WHERE done_at IS NULL AND run_at <= ${now().toISOString()} AND attempts < ${MAX_ATTEMPTS}
        ORDER BY run_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED`);
      const row = rows[0];
      if (!row) return null;
      const job = {
        id: row.id,
        business: row.business_id,
        kind: row.kind,
        payload: row.payload,
        attempts: row.attempts,
      };
      try {
        const handler = handlers[job.kind];
        if (!handler) throw new Error("No handler for jobs of kind " + job.kind);
        await handler(job);
        await tx.execute(
          sql`UPDATE jobs SET done_at = ${now().toISOString()}, attempts = attempts + 1 WHERE id = ${job.id}`,
        );
        return "done";
      } catch (error) {
        const attempts = job.attempts + 1;
        const later = new Date(now().getTime() + backoff(attempts)).toISOString();
        await tx.execute(
          sql`UPDATE jobs SET attempts = ${attempts}, last_error = ${String(error)}, run_at = ${later} WHERE id = ${job.id}`,
        );
        return "failed";
      }
    });
    if (outcome === null) {
      if (!until) break;
      const { rows } = await db.execute<{ next: string | null }>(
        sql`SELECT min(run_at) AS next FROM jobs WHERE done_at IS NULL AND attempts < ${MAX_ATTEMPTS}`,
      );
      const next = rows[0]?.next ? Date.parse(rows[0].next) : null;
      if (next === null || next > until.getTime()) break;
      await pause(Math.max(0, next - now().getTime()));
      continue;
    }
    if (outcome === "done") done++;
    else failed++;
    await pause(Math.max(0, 1000 / perSecond - (Date.now() - started)));
  }
  return { done, failed };
}
