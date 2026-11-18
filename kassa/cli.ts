export {};
// Kassa's command line, as the Stripe CLI is Stripe's:
//   npm run kassa:cli -- events              the latest events
//   npm run kassa:cli -- resend evt_…        send an event to the webhook address again
const base = process.env.KASSA_URL ?? "http://localhost:4242";
const key = process.env.KASSA_SECRET_KEY ?? "sk_test_kassa_local";
const [command, id] = process.argv.slice(2);
const headers = { authorization: "Bearer " + key };

if (command === "events") {
  const { data } = await (await fetch(base + "/v1/events?limit=20", { headers })).json();
  for (const event of data) {
    console.log(new Date(event.created * 1000).toISOString(), event.id, event.type, event.data.object.id);
  }
} else if (command === "resend" && id) {
  const answer = await fetch(base + "/v1/events/" + id + "/resend", { method: "POST", headers });
  console.log(answer.ok ? "Sent " + id + " again." : "Kassa answered " + answer.status);
} else {
  console.log("Usage: npm run kassa:cli -- events | resend evt_…");
}
