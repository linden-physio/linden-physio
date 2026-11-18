# Linden Physio

The clinic's booking page at lindenphysio.com, and the server code behind it, in one Next.js app.
src/ holds the pages and components; server/ holds what works out the free times, takes bookings and
cancels them, and the database's tables and migrations.

It needs Postgres, with two databases: one for the app and one for the tests. compose.yaml starts
both in Docker, with Mailpit, which catches the mail the app sends (http://localhost:8025). Their addresses go in a file `.env.local`, which git ignores: copy `.env.example` to
`.env.local` and fill it in. The tables are described in server/schema.ts; `npm run migrate` brings
the database up to date.

    docker compose up -d     # Postgres 18, as in production (compose.yaml)
    cp .env.example .env.local
    npm install
    npm run migrate
    npm run seed
    npm run dev      # http://localhost:5173
    npm test

The server's addresses (/api/free-times, /api/bookings) are written down in server/openapi.yaml.

## The other companies' systems, on this computer

The clinic works with systems it doesn't own. For this computer and the films, each has a stand-in in
this repository that behaves like the real one, with its own database:

- **Kassa** (kassa/), a card payment provider shaped like Stripe: `npm run kassa` (http://localhost:4242).
  Its card form, its bank's 3-D Secure page, its signed webhooks and their retries, refunds and
  Idempotency-Keys work as Stripe's do. It moves no money and takes only Stripe's test card numbers,
  like 4242 4242 4242 4242, or 4000 0027 6000 3184 for 3-D Secure. `npm run kassa:cli -- events` lists
  what happened.

## The words on the booking page

The line under the business's name and the line about each service come from Payload, a CMS that runs
inside this app (src/payload.config.ts). Its editor is at http://localhost:5173/cms, for staff who may
change the words (the owner), signed in as they always are. Its tables are in the same database, in a
schema called "payload"; `npm run migrate` makes them with Payload's own migrations
(server/payload-migrations/). Publishing makes the booking page forget its kept words. Prices and
everything a booking owns stay in our own tables.
