import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { makeClinic } from "./clinic.ts";
import { fromInstant, toInstant } from "./clock.ts";
import { log } from "./log.ts";

// "Can I move Thursday's visit to next week, a morning?" A person writes what they want in their own
// words, on their bookings page, and a language model (Claude, over Anthropic's API) works out which
// booking and which free time they mean. It can only look and propose: it reads the person's own
// bookings and the free times, and suggests one move. The person presses a button to make it, and that
// button is an ordinary server action with its own checks (src/mine/actions.ts). Whatever the message
// says, the model can't touch anyone else's booking, or move one without the person.

type Clinic = ReturnType<typeof makeClinic>;
export type Proposal = { booking: string; service: string; from: string; to: string; with: string[] };
export type Answer = { reply: string; proposal: Proposal | null };

// Fixed for every request, so the API can keep it cached between them.
const SYSTEM = `You help the patients of a physiotherapy clinic move their bookings, in a text box on their bookings page.

You get the patient's message, the date and time now, and their upcoming bookings. Find out which booking they mean and when they'd like it instead. Look at the free times for that booking with free_times, as many days as you need, then propose exactly one move with propose_move. The patient sees your proposal with a button and decides; you can't move anything yourself.

- If it's unclear which booking or when, and the free times don't settle it, ask one short question instead of proposing.
- If nothing free fits what they asked, say so and propose the nearest time that does fit, or none.
- Only bookings in the list exist. If they want something else (cancel, a new booking, a question about treatment), say briefly that this box only moves bookings, and that cancelling is the button next to each booking.
- Times are the clinic's local time (Stockholm). Write them like "Tuesday 1 December at 09:30".
- Reply in the language the patient wrote in, in one to three plain sentences, without markdown.`;

const when = (instant: string) => {
  const { date, time } = fromInstant(instant);
  const day = new Date(date + "T12:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return `${day} ${date} ${time}`;
};

export async function reschedule(
  clinic: Clinic,
  email: string,
  message: string,
  now = new Date(),
  client = new Anthropic(),
): Promise<Answer> {
  const own = await clinic.bookingsFor(email);
  let proposal: Proposal | null = null;
  const mine = (id: string) => own.find((booking) => booking.id === id);

  const freeTimesTool = betaZodTool({
    name: "free_times",
    description:
      "The free start times on one day for one of the patient's bookings (its service, any physiotherapist who does it). If the clinic is closed that day, says so and gives the nearest free time.",
    inputSchema: z.object({
      booking: z.string().describe("The booking's id, from the list"),
      date: z.string().describe("The day, YYYY-MM-DD"),
    }),
    run: async ({ booking, date }) => {
      const found = mine(booking);
      if (!found) return "No such booking among the patient's.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Give the date as YYYY-MM-DD.";
      const service = await serviceOf(clinic, found.service);
      const free = service ? await clinic.freeTimesOn(date, service) : null;
      if (!free) return "No free times found.";
      if (free.closed)
        return `Closed on ${date}. Nearest free: ${free.nearest ? when(free.nearest.startsAt) : "none"}.`;
      const times = free.times.filter((t) => Date.parse(t.startsAt) > now.getTime());
      if (times.length === 0) return `Nothing free on ${date}.`;
      return times.map((t) => `${fromInstant(t.startsAt).time} with ${t.with.join(" or ")}`).join("\n");
    },
  });

  const proposeTool = betaZodTool({
    name: "propose_move",
    description:
      "Propose moving one of the patient's bookings to a free time. The patient sees it with a button and decides. Call it at most once.",
    inputSchema: z.object({
      booking: z.string().describe("The booking's id, from the list"),
      date: z.string().describe("The new day, YYYY-MM-DD"),
      time: z.string().describe("The new start time, HH:MM, one of the free times"),
    }),
    run: async ({ booking, date, time }) => {
      const found = mine(booking);
      if (!found) return "No such booking among the patient's.";
      const service = await serviceOf(clinic, found.service);
      const free = service ? await clinic.freeTimesOn(date, service) : null;
      const start = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? toInstant(date, time) : null;
      const slot = start && free?.times.find((t) => t.startsAt === start);
      if (!slot || Date.parse(start) <= now.getTime()) return `${date} ${time} isn't free. Check free_times.`;
      proposal = { booking, service: found.service, from: found.startsAt, to: start, with: slot.with };
      return "Proposed. The patient will see it with a button. Now write your short reply.";
    },
  });

  const bookings = own.length
    ? own.map((b) => `- id ${b.id}: ${b.service} with ${b.with}, ${when(b.startsAt)}`).join("\n")
    : "(none)";
  const final = await client.beta.messages.toolRunner({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // If the model declines, the API answers with another model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: [freeTimesTool, proposeTool],
    max_iterations: 12,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Now: ${when(now.toISOString())}\n\nThe patient's upcoming bookings:\n${bookings}` },
          { type: "text", text: `The patient's message:\n${message}` },
        ],
      },
    ],
  });
  log("info", "reschedule answered", {
    proposed: proposal !== null,
    stop: final.stop_reason,
    model: final.model,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  });
  if (final.stop_reason === "refusal") return { reply: "Sorry, I can't help with that here.", proposal: null };
  const reply = final.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  // No words: it ran out of turns, still looking.
  if (!reply || final.stop_reason !== "end_turn")
    return { reply: "Sorry, we couldn't work that out. Try saying it another way, or email us.", proposal: null };
  return { reply, proposal };
}

// The service's id, from its title as the bookings list shows it.
async function serviceOf(clinic: Clinic, title: string) {
  return (await clinic.offers()).find((s) => s.title === title)?.id ?? null;
}
