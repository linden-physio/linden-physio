# Runbook

What to do when the booking system sends an alert to hello@lindenphysio.com, or something else goes
wrong in production. Each alert's subject says which part this is.

## Find out what happened

- **Logs.** Vercel, project linden-physio, Logs. Every line is JSON. Search for the booking's id
  (`"booking":"…"`) to follow one booking from the form to the bank, the webhook, the job and the mail;
  or for `"level":"error"`. Lines name no one: look the booking up by its id.
- **Traces.** Each log line has a `trace` id. Open it in the trace viewer to see the request's steps and
  how long each took.
- **Errors in browsers.** /staff/errors, signed in as the owner.
- **Jobs.** The `jobs` table: `last_error` and `attempts` for each job not done. A job with
  `attempts = 8` has given up and will not run again by itself.

## "the accounting file for DAY isn't booked"

The night's file to Ekonomihuset (the accounting system) didn't arrive, or arrived and was rejected.
Until it's booked, the accountant's books are missing that day's deposits and refunds.

1. Read the alert: it says whether the file couldn't be made or sent (the job's error) or was rejected
   (Ekonomihuset's receipt, with the row).
2. Fix the cause, ship the fix, and wait for the deploy.
3. Send that day's file again:
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://lindenphysio.com/api/cron/accounting?day=DAY"`
   The answer counts the jobs done; the receipt is read a few seconds later.
4. Check the staff's day for DAY, as the owner: "To the accountant" says **Booked**.

A day that was booked already is refused by Ekonomihuset: a file is never booked twice.

## "a … job failed for good"

A job failed eight times, over a few hours, and has stopped. The alert has its last error and what it
was for. Fix the cause; then, to run it again, set its attempts back:
`UPDATE jobs SET attempts = 0, run_at = now() WHERE id = …;` and call /api/cron/work, or wait for the
morning.

## A deploy broke the site

Roll back first, find the cause after. Vercel, project linden-physio, Deployments: the last good
production deployment, ⋯, **Instant Rollback**. It takes seconds: the domain points at that build again.
The database is not rolled back: a migration in the bad deploy stays. Then fix forward on a branch.

## Afterwards

Write what happened in docs/incidents/, from docs/incidents/template.md, within a few days: what the
people affected saw, the timeline, why, and what changes so it can't happen the same way again. Blame
the system, not a person: the question is what let a reasonable person's action cause it.
