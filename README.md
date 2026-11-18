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
