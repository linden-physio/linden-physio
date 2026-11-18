import { createHmac } from "node:crypto";
import { newId, now, pool } from "./store.ts";

// Where Kassa sends its events, and the secret it signs them with. Stripe keeps these per endpoint, set
// in its dashboard; Kassa has one, from its settings.
const url = () => process.env.KASSA_WEBHOOK_URL;
const secret = () => process.env.KASSA_WEBHOOK_SECRET ?? "";

// How long Kassa waits for an answer before it counts the try as failed.
const TIMEOUT_MS = 10_000;
// When to try again after each failed try, in seconds: soon, then further and further apart, for about
// three days, as Stripe does. KASSA_RETRY_SCALE shortens them all (0.1 makes 10 seconds into 1).
const RETRY_AFTER = [10, 60, 5 * 60, 30 * 60, 2 * 3600, 6 * 3600, 12 * 3600, 24 * 3600, 24 * 3600];

// The signature header, in Stripe's scheme: the time, and an HMAC-SHA256 of "time.body" under the
// endpoint's secret. The time is inside what's signed, so an old event can't be sent again later.
export function signature(body: string, time = now()): string {
  const v1 = createHmac("sha256", secret())
    .update(time + "." + body)
    .digest("hex");
  return "t=" + time + ",v1=" + v1;
}

// Something happened: keep it as an event, and queue it for the webhook address.
export async function emit(type: string, object: unknown) {
  const id = newId("evt");
  await pool.query("INSERT INTO events (id, type, created, object) VALUES ($1, $2, $3, $4)", [
    id,
    type,
    now(),
    JSON.stringify(object),
  ]);
  if (url()) await pool.query("INSERT INTO deliveries (event, url, next_try) VALUES ($1, $2, now())", [id, url()]);
  return id;
}

// Send an event again, as `kassa events resend` and Stripe's "Resend" button do.
export async function resend(event: string) {
  if (!url()) throw new Error("KASSA_WEBHOOK_URL isn't set");
  await pool.query("INSERT INTO deliveries (event, url, next_try) VALUES ($1, $2, now())", [event, url()]);
}

async function deliver(delivery: { id: number; event: string; url: string; attempts: number }) {
  const { rows } = await pool.query("SELECT * FROM events WHERE id = $1", [delivery.event]);
  const event = rows[0];
  const body = JSON.stringify(
    {
      id: event.id,
      object: "event",
      type: event.type,
      created: event.created,
      data: { object: event.object },
      livemode: false,
    },
    null,
    2,
  );
  let status: string;
  try {
    const answer = await fetch(delivery.url, {
      method: "POST",
      headers: { "content-type": "application/json", "kassa-signature": signature(body), "user-agent": "Kassa/1.0" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    status = String(answer.status);
  } catch (error) {
    status = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "unreachable";
  }
  const attempts = delivery.attempts + 1;
  const ok = status.startsWith("2");
  const scale = Number(process.env.KASSA_RETRY_SCALE ?? 1);
  const wait = RETRY_AFTER[attempts - 1];
  console.log(
    `${event.type} ${event.id} -> ${delivery.url}: ${status}` +
      (ok ? "" : wait ? `, again in ${Math.round(wait * scale)} s` : ", giving up"),
  );
  await pool.query(
    `UPDATE deliveries SET attempts = $2, last_status = $3,
       delivered_at = CASE WHEN $4 THEN now() END,
       next_try = CASE WHEN $4 OR $5::float IS NULL THEN NULL ELSE now() + make_interval(secs => $5::float) END
     WHERE id = $1`,
    [delivery.id, attempts, status, ok, wait === undefined ? null : wait * scale],
  );
}

// Every second, send the events that are due, one try each.
export function startDelivering() {
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const { rows } = await pool.query(
        "SELECT id, event, url, attempts FROM deliveries WHERE next_try <= now() ORDER BY next_try LIMIT 10",
      );
      // Not one after another: a slow endpoint mustn't hold up the rest.
      await Promise.all(rows.map(deliver));
    } catch (error) {
      console.error(error);
    } finally {
      busy = false;
    }
  }, 1000);
}
