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
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
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
