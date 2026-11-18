import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { html, raw } from "hono/html";
import { createTables, intent, newId, now, pool, shown, type Intent } from "./store.ts";
import { emit, resend, startDelivering } from "./webhooks.ts";

// Kassa: a stand-in for a card payment provider like Stripe, for the films and for this computer. It
// has Stripe's shape: a secret key for servers and a publishable key for pages, payment intents with
// client secrets, a card form on its own address that the shop's page shows in a frame, a bank's
// 3-D Secure page, signed webhooks that are sent again until they're answered, refunds, and
// Idempotency-Keys. It moves no money, and it takes only Stripe's test card numbers.

const SECRET_KEY = process.env.KASSA_SECRET_KEY ?? "sk_test_kassa_local";
const PUBLISHABLE_KEY = process.env.KASSA_PUBLISHABLE_KEY ?? "pk_test_kassa_local";
const PORT = Number(process.env.KASSA_PORT ?? 4242);

const app = new Hono();

// The API is for the shop's server, with the secret key. The card form below is for anyone's browser.
app.use("/v1/*", async (c, next) => {
  if (c.req.header("authorization") !== "Bearer " + SECRET_KEY) {
    return c.json({ error: { type: "invalid_request_error", message: "Invalid API key provided." } }, 401);
  }
  await next();
});

// The same Idempotency-Key with the same request gets the first answer again, and nothing is done twice.
// The same key with a different request is refused.
async function once(c: Context, work: () => Promise<{ status: 200 | 400 | 404; body: object }>) {
  const key = c.req.header("idempotency-key");
  const request = c.req.method + " " + c.req.path + " " + JSON.stringify(await c.req.parseBody());
  if (key) {
    const { rows } = await pool.query("SELECT * FROM idempotency_keys WHERE key = $1", [key]);
    if (rows[0]) {
      if (rows[0].request !== request) {
        return c.json(
          {
            error: {
              type: "idempotency_error",
              message:
                "Keys for idempotent requests can only be used with the same parameters they were first used with.",
            },
          },
          400,
        );
      }
      c.header("idempotent-replayed", "true");
      return c.json(rows[0].body, rows[0].status);
    }
  }
  const { status, body } = await work();
  if (key) {
    await pool.query(
      "INSERT INTO idempotency_keys (key, request, status, body) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      [key, request, status, JSON.stringify(body)],
    );
  }
  return c.json(body, status);
}

// Stripe's requests are form-encoded, with nested keys like metadata[booking]=…
function metadataOf(form: Record<string, unknown>): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const [name, value] of Object.entries(form)) {
    const key = /^metadata\[(.+)\]$/.exec(name)?.[1];
    if (key) metadata[key] = String(value);
  }
  return metadata;
}

const notFound = (id: string) => ({
  status: 404 as const,
  body: { error: { type: "invalid_request_error", message: "No such payment_intent: '" + id + "'" } },
});

app.post("/v1/payment_intents", (c) =>
  once(c, async () => {
    const form = await c.req.parseBody();
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount < 300) {
      return {
        status: 400,
        body: { error: { type: "invalid_request_error", message: "Amount must be at least 300 öre (3.00 kr)." } },
      };
    }
    const id = newId("pi");
    const { rows } = await pool.query<Intent>(
      `INSERT INTO payment_intents (id, client_secret, amount, currency, description, metadata, status, created)
       VALUES ($1, $2, $3, $4, $5, $6, 'requires_payment_method', $7) RETURNING *`,
      [
        id,
        id + "_secret_" + newId("s").slice(2),
        amount,
        String(form.currency ?? "sek"),
        form.description ?? null,
        metadataOf(form),
        now(),
      ],
    );
    await emit("payment_intent.created", shown(rows[0]));
    return { status: 200, body: shown(rows[0]) };
  }),
);

app.get("/v1/payment_intents/:id", async (c) => {
  const found = await intent(c.req.param("id"));
  if (!found) return c.json(notFound(c.req.param("id")).body, 404);
  return c.json(shown(found));
});

app.post("/v1/refunds", (c) =>
  once(c, async () => {
    const form = await c.req.parseBody();
    const paid = await intent(String(form.payment_intent));
    if (!paid) return notFound(String(form.payment_intent));
    const amount = form.amount ? Number(form.amount) : paid.amount - paid.amount_refunded;
    if (paid.status !== "succeeded") {
      return {
        status: 400,
        body: { error: { type: "invalid_request_error", message: "This PaymentIntent has not been paid." } },
      };
    }
    if (amount <= 0 || paid.amount_refunded + amount > paid.amount) {
      return {
        status: 400,
        body: {
          error: {
            type: "invalid_request_error",
            code: "charge_already_refunded",
            message: "Charge " + paid.id + " has already been refunded.",
          },
        },
      };
    }
    const refund = {
      id: newId("re"),
      object: "refund",
      payment_intent: paid.id,
      amount,
      currency: paid.currency,
      status: "succeeded",
      created: now(),
    };
    await pool.query("INSERT INTO refunds (id, payment_intent, amount, status, created) VALUES ($1, $2, $3, $4, $5)", [
      refund.id,
      paid.id,
      amount,
      refund.status,
      refund.created,
    ]);
    const { rows } = await pool.query<Intent>(
      "UPDATE payment_intents SET amount_refunded = amount_refunded + $2 WHERE id = $1 RETURNING *",
      [paid.id, amount],
    );
    await emit("refund.created", refund);
    await emit("charge.refunded", shown(rows[0]));
    return { status: 200, body: refund };
  }),
);

app.get("/v1/events", async (c) => {
  const { rows } = await pool.query("SELECT * FROM events ORDER BY created DESC, id LIMIT $1", [
    Number(c.req.query("limit") ?? 20),
  ]);
  return c.json({
    object: "list",
    data: rows.map((e) => ({
      id: e.id,
      object: "event",
      type: e.type,
      created: e.created,
      data: { object: e.object },
    })),
  });
});

app.post("/v1/events/:id/resend", async (c) => {
  await resend(c.req.param("id"));
  return c.json({ id: c.req.param("id"), resent: true });
});

// The card form. The shop's page shows it in a frame, so the card number is typed into a page from
// Kassa's address and posted to Kassa: the shop's server never sees it. It is a plain form, so it
// works without JavaScript too.
const page = (title: string, body: unknown) =>
  html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body {
            font:
              16px/1.5 system-ui,
              sans-serif;
            margin: 0;
            padding: 16px;
            color: #1d2433;
            background: #fff;
          }
          label {
            display: block;
            font-size: 14px;
            margin-top: 12px;
          }
          input {
            box-sizing: border-box;
            width: 100%;
            font: inherit;
            padding: 10px 12px;
            border: 1px solid #c8ccd6;
            border-radius: 6px;
          }
          .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          button {
            margin-top: 16px;
            width: 100%;
            font: inherit;
            font-weight: 600;
            padding: 10px;
            border: 0;
            border-radius: 6px;
            background: #4b3fd6;
            color: #fff;
          }
          .error {
            color: #b3261e;
            margin: 12px 0 0;
          }
          .small {
            font-size: 13px;
            color: #5d6577;
          }
          .bank {
            max-width: 420px;
            margin: 40px auto;
            border: 1px solid #c8ccd6;
            border-radius: 8px;
            padding: 24px;
          }
          .fail {
            background: #fff;
            color: #b3261e;
            border: 1px solid #b3261e;
          }
        </style>
      </head>
      <body>
        ${body}
      </body>
    </html>`;

const kronor = (ore: number) => (ore / 100).toLocaleString("sv-SE", { style: "currency", currency: "SEK" });

function cardForm(found: Intent, returnUrl: string, error?: string) {
  return page(
    "Pay with card",
    html`<form method="post" action="/elements/card" target="_top">
      <input type="hidden" name="client_secret" value="${found.client_secret}" />
      <input type="hidden" name="return_url" value="${returnUrl}" />
      <label for="number">Card number</label>
      <input
        id="number"
        name="number"
        inputmode="numeric"
        autocomplete="cc-number"
        placeholder="1234 1234 1234 1234"
        required
      />
      <div class="row">
        <div>
          <label for="exp">Expiry</label
          ><input id="exp" name="exp" autocomplete="cc-exp" placeholder="MM / YY" required />
        </div>
        <div>
          <label for="cvc">CVC</label
          ><input id="cvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required />
        </div>
      </div>
      ${error ? html`<p class="error" role="alert">${error}</p>` : ""}
      <button type="submit">Pay ${kronor(found.amount)}</button>
      <p class="small">
        Kassa test mode: no money moves. Try 4242 4242 4242 4242, or 4000 0027 6000 3184 for 3-D Secure.
      </p>
    </form>`,
  );
}

async function bySecret(secret: unknown): Promise<Intent | null> {
  const { rows } = await pool.query<Intent>("SELECT * FROM payment_intents WHERE client_secret = $1", [
    String(secret ?? ""),
  ]);
  return rows[0] ?? null;
}

app.get("/elements/card", async (c) => {
  if (c.req.query("key") !== PUBLISHABLE_KEY) return c.text("Invalid publishable key.", 401);
  const found = await bySecret(c.req.query("client_secret"));
  if (!found) return c.text("No such payment.", 404);
  if (found.status === "succeeded") return c.html(page("Paid", html`<p>Paid ${kronor(found.amount)}. Thank you.</p>`));
  return c.html(cardForm(found, c.req.query("return_url") ?? ""));
});

// Luhn's check, which every real card number passes.
function luhn(number: string): boolean {
  let sum = 0;
  for (let i = 0; i < number.length; i++) {
    let digit = Number(number[number.length - 1 - i]);
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }
  return number.length >= 12 && sum % 10 === 0;
}

// Back to the shop's return address, the way Stripe sends people back.
function back(returnUrl: string, found: Intent, status: string) {
  const to = new URL(returnUrl);
  to.searchParams.set("payment_intent", found.id);
  to.searchParams.set("payment_intent_client_secret", found.client_secret);
  to.searchParams.set("redirect_status", status);
  return to.toString();
}

async function succeed(found: Intent, card: { brand: string; last4: string }) {
  const { rows } = await pool.query<Intent>(
    "UPDATE payment_intents SET status = 'succeeded', card_brand = $2, card_last4 = $3, last_error = NULL WHERE id = $1 RETURNING *",
    [found.id, card.brand, card.last4],
  );
  await emit("payment_intent.succeeded", shown(rows[0]));
}

async function fail(found: Intent, message: string) {
  const { rows } = await pool.query<Intent>(
    "UPDATE payment_intents SET status = 'requires_payment_method', last_error = $2 WHERE id = $1 RETURNING *",
    [found.id, message],
  );
  await emit("payment_intent.payment_failed", shown(rows[0]));
}

app.post("/elements/card", async (c) => {
  const form = await c.req.parseBody();
  const found = await bySecret(form.client_secret);
  if (!found) return c.text("No such payment.", 404);
  const returnUrl = String(form.return_url ?? "");
  if (found.status === "succeeded") return c.redirect(back(returnUrl, found, "succeeded"), 303);
  const number = String(form.number ?? "").replace(/\D/g, "");
  const card = {
    brand: number.startsWith("4") ? "visa" : number.startsWith("5") ? "mastercard" : "card",
    last4: number.slice(-4),
  };
  // Stripe's test cards, and what each one does. The form posted to the whole window (target _top), so
  // a refused card goes back to the shop too, with redirect_status=failed, and the shop shows the form
  // again with what went wrong.
  if (!luhn(number)) {
    await pool.query("UPDATE payment_intents SET last_error = $2 WHERE id = $1", [
      found.id,
      "Your card number is invalid.",
    ]);
    return c.redirect(back(returnUrl, found, "failed"), 303);
  }
  if (number === "4242424242424242" || number === "5555555555554444") {
    await succeed(found, card);
    return c.redirect(back(returnUrl, found, "succeeded"), 303);
  }
  if (number === "4000002760003184" || number === "4000002500003155") {
    await pool.query(
      "UPDATE payment_intents SET status = 'requires_action', card_brand = $2, card_last4 = $3 WHERE id = $1",
      [found.id, card.brand, card.last4],
    );
    // To the card's bank, which asks the person to prove the card is theirs.
    return c.redirect("/3ds/" + found.id + "?" + new URLSearchParams({ return_url: returnUrl }), 303);
  }
  await fail(
    found,
    number === "4000000000009995"
      ? "Your card has insufficient funds."
      : number === "4000000000000002"
        ? "Your card was declined."
        : "Your card was declined. Your request was in test mode, but used a non-test card.",
  );
  return c.redirect(back(returnUrl, found, "failed"), 303);
});

// The bank's own page: 3-D Secure. Here it's a page with two buttons, as on Stripe's test bank.
app.get("/3ds/:id", async (c) => {
  const found = await intent(c.req.param("id"));
  if (!found || found.status !== "requires_action") return c.text("Nothing to approve.", 404);
  const returnUrl = c.req.query("return_url") ?? "";
  return c.html(
    page(
      "Your bank",
      html`<div class="bank">
        <p class="small">Your bank · 3-D Secure test page</p>
        <h1 style="font-size:20px">Approve a payment of ${kronor(found.amount)}</h1>
        <p>To ${found.description ?? "a shop"}, with the card ending ${found.card_last4}.</p>
        <form method="post">
          <input type="hidden" name="return_url" value="${returnUrl}" />
          <button name="answer" value="approve">Approve</button>
          <button name="answer" value="fail" class="fail">Fail authentication</button>
        </form>
      </div>`,
    ),
  );
});

app.post("/3ds/:id", async (c) => {
  const found = await intent(c.req.param("id"));
  if (!found || found.status !== "requires_action") return c.text("Nothing to approve.", 404);
  const form = await c.req.parseBody();
  const returnUrl = String(form.return_url ?? "");
  if (form.answer !== "approve") {
    await fail(found, "We are unable to authenticate your payment method.");
    return c.redirect(back(returnUrl, found, "failed"), 303);
  }
  await succeed(found, { brand: found.card_brand ?? "card", last4: found.card_last4 ?? "" });
  // A bank says it's sending you back, and takes a moment. Close the tab now, and the shop never
  // sees you come back: only the webhook can tell it you paid.
  const to = back(returnUrl, found, "succeeded");
  return c.html(
    page(
      "Approved",
      html`<div class="bank">
        <meta http-equiv="refresh" content="3;url=${to}" />
        <h1 style="font-size:20px">Approved</h1>
        <p>Taking you back to the shop…</p>
        <p class="small"><a href="${to}">Go back now</a></p>
      </div>`,
    ),
  );
});

// What Kassa's dashboard shows: the latest payments, and each event's tries at the webhook address.
app.get("/", async (c) => {
  const intents = await pool.query<Intent>("SELECT * FROM payment_intents ORDER BY created DESC LIMIT 20");
  const events = await pool.query(
    `SELECT e.id, e.type, e.created, d.attempts, d.last_status, d.delivered_at, d.next_try
     FROM events e LEFT JOIN deliveries d ON d.event = e.id ORDER BY e.created DESC, d.id DESC LIMIT 40`,
  );
  const time = (s: number) => new Date(s * 1000).toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" });
  return c.html(
    page(
      "Kassa",
      html`<h1 style="font-size:20px">Kassa · test mode</h1>
        <h2 style="font-size:16px">Payments</h2>
        <table>
          ${raw(intents.rows.map((i) => `<tr><td>${time(i.created)}</td><td>${i.id}</td><td>${kronor(i.amount)}</td><td>${i.status}</td><td>${i.amount_refunded ? "refunded " + kronor(i.amount_refunded) : ""}</td></tr>`).join(""))}
        </table>
        <h2 style="font-size:16px">Events</h2>
        <table>
          ${raw(events.rows.map((e) => `<tr><td>${time(e.created)}</td><td>${e.id}</td><td>${e.type}</td><td>${e.attempts ?? ""} ${e.attempts === 1 ? "try" : e.attempts ? "tries" : ""}</td><td>${e.last_status ?? ""}</td><td>${e.delivered_at ? "delivered" : e.next_try ? "next try " + new Date(e.next_try).toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }) : ""}</td></tr>`).join(""))}
        </table>`,
    ),
  );
});

await createTables();
startDelivering();
serve({ fetch: app.fetch, port: PORT });
console.log("Kassa (test mode) on http://localhost:" + PORT);
