<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Before you say a change is done

- Run `npm run build`, `npm run lint` and `npm test`. The tests need Postgres: see README.md.
- If the change shows on the page, look at it. Start it with `npm run dev`, open
  http://localhost:5173/?day=2026-11-19&service=follow-up (pick a day after today), and take a screenshot at phone
  width (390 px) and at desktop width. Book a time and read what the page says.
- Read the page as the person booking would. If it now shows something they can't act on, or an answer that leaves
  out what they need to know, say so in your summary, even when the ticket asked for exactly that.
- Never point the page at the clinic's real database: every booking you make there is real.
