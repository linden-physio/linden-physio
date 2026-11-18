import pg from "pg";
import { randomBytes } from "node:crypto";

// Kassa's own database: its payments, refunds and events. Not the clinic's: Kassa is another company's
// system, and the clinic only ever sees what Kassa's answers and webhooks tell it.
export const pool = new pg.Pool({ connectionString: process.env.KASSA_DATABASE_URL });

// Ids like Stripe's: a prefix that says what it is, then random letters. pi_ is a payment intent,
// re_ a refund, evt_ an event.
export function newId(prefix: string): string {
  return prefix + "_" + randomBytes(12).toString("base64url").replace(/[-_]/g, "x");
}

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      id text PRIMARY KEY,
      client_secret text NOT NULL,
      amount integer NOT NULL,
      currency text NOT NULL,
      description text,
      metadata jsonb NOT NULL DEFAULT '{}',
      status text NOT NULL,
      -- Only what a receipt shows: never the card number itself.
      card_brand text,
      card_last4 text,
      last_error text,
      amount_refunded integer NOT NULL DEFAULT 0,
      created integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS refunds (
      id text PRIMARY KEY,
      payment_intent text NOT NULL REFERENCES payment_intents(id),
      amount integer NOT NULL,
      status text NOT NULL,
      created integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY,
      type text NOT NULL,
      created integer NOT NULL,
      object jsonb NOT NULL
    );
    -- Each try at delivering an event to the webhook address, and when to try next.
    CREATE TABLE IF NOT EXISTS deliveries (
      id serial PRIMARY KEY,
      event text NOT NULL REFERENCES events(id),
      url text NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      next_try timestamptz,
      last_status text,
      delivered_at timestamptz
    );
    -- The answers to requests sent with an Idempotency-Key, kept for 24 hours: the same key again gets
    -- the same answer, and nothing happens twice.
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key text PRIMARY KEY,
      request text NOT NULL,
      status integer NOT NULL,
      body jsonb NOT NULL,
      created timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export type Intent = {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  description: string | null;
  metadata: Record<string, string>;
  status: string;
  card_brand: string | null;
  card_last4: string | null;
  last_error: string | null;
  amount_refunded: number;
  created: number;
};

// A payment intent as the API shows it, in Stripe's shape.
export function shown(intent: Intent) {
  return {
    id: intent.id,
    object: "payment_intent",
    amount: intent.amount,
    amount_received: intent.status === "succeeded" ? intent.amount : 0,
    amount_refunded: intent.amount_refunded,
    currency: intent.currency,
    description: intent.description,
    metadata: intent.metadata,
    status: intent.status,
    client_secret: intent.client_secret,
    payment_method: intent.card_last4 ? { card: { brand: intent.card_brand, last4: intent.card_last4 } } : null,
    last_payment_error: intent.last_error ? { message: intent.last_error } : null,
    created: intent.created,
    livemode: false,
  };
}

export async function intent(id: string): Promise<Intent | null> {
  const { rows } = await pool.query<Intent>("SELECT * FROM payment_intents WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export const now = () => Math.floor(Date.now() / 1000);
