import { createHmac, timingSafeEqual } from "node:crypto";

// Kassa's library for the shop's server, as stripe is Stripe's: it knows Kassa's addresses and sends the
// secret key with every request.

export type PaymentIntent = {
  id: string;
  object: "payment_intent";
  amount: number;
  amount_received: number;
  amount_refunded: number;
  currency: string;
  description: string | null;
  metadata: Record<string, string>;
  status: "requires_payment_method" | "requires_action" | "processing" | "succeeded" | "canceled";
  client_secret: string;
  last_payment_error: { message: string } | null;
  created: number;
};

export type Refund = { id: string; object: "refund"; payment_intent: string; amount: number; status: string };

export class KassaError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// What Kassa sends to a webhook address.
export type KassaEvent = {
  id: string;
  object: "event";
  type: string;
  created: number;
  data: { object: PaymentIntent };
};

// Did Kassa send this event? The header is "t=1795011770,v1=5257a8…": the time it was signed, and an
// HMAC-SHA256, under the endpoint's secret, of the time, a dot and the body exactly as it came. Returns
// the event, or throws if the signature doesn't match or is more than tolerance seconds old.
function constructEvent(raw: string, header: string | null, secret: string, tolerance = 300): KassaEvent {
  const parts = Object.fromEntries((header ?? "").split(",").map((part) => part.split("=", 2)));
  const time = Number(parts.t);
  if (!Number.isInteger(time) || !parts.v1) throw new KassaError("No signature in the Kassa-Signature header.", 400);
  const expected = createHmac("sha256", secret)
    .update(time + "." + raw)
    .digest();
  const given = Buffer.from(parts.v1, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new KassaError("No signature matches the expected signature for the payload.", 400);
  }
  if (Math.abs(Date.now() / 1000 - time) > tolerance)
    throw new KassaError("Timestamp outside the tolerance zone.", 400);
  return JSON.parse(raw);
}

// Nested objects as Stripe's form encoding writes them: metadata[booking]=…
function encode(params: Record<string, string | number | Record<string, string> | undefined>): string {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === "object") for (const [k, v] of Object.entries(value)) form.set(`${key}[${k}]`, v);
    else form.set(key, String(value));
  }
  return form.toString();
}

export function kassa(secretKey: string, base: string) {
  async function call<T>(
    method: string,
    path: string,
    params?: Parameters<typeof encode>[0],
    idempotencyKey?: string,
  ): Promise<T> {
    const answer = await fetch(base + path, {
      method,
      headers: {
        authorization: "Bearer " + secretKey,
        ...(params ? { "content-type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: params ? encode(params) : undefined,
    });
    const body = await answer.json();
    if (!answer.ok)
      throw new KassaError(body.error?.message ?? "Kassa answered " + answer.status, answer.status, body.error?.code);
    return body as T;
  }

  return {
    webhooks: { constructEvent },
    paymentIntents: {
      create: (
        params: { amount: number; currency: string; description?: string; metadata?: Record<string, string> },
        options?: { idempotencyKey?: string },
      ) => call<PaymentIntent>("POST", "/v1/payment_intents", params, options?.idempotencyKey),
      retrieve: (id: string) => call<PaymentIntent>("GET", "/v1/payment_intents/" + encodeURIComponent(id)),
    },
    refunds: {
      create: (params: { payment_intent: string; amount?: number }, options?: { idempotencyKey?: string }) =>
        call<Refund>("POST", "/v1/refunds", params, options?.idempotencyKey),
    },
  };
}
