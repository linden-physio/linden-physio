import ssh2 from "ssh2";
import { and, eq, gt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { businesses, exports, services } from "./schema.ts";
import { enqueue, type Job } from "./jobs.ts";
import { fromInstant } from "./clock.ts";
import { db } from "./db.ts";
import { setting } from "./env.ts";
import { fileAlert } from "./alerts.ts";
import { log } from "./log.ts";

// The nightly file to the accounting system (Ekonomihuset), in SIE 4, the Swedish standard. A deposit
// isn't income yet: it's money paid ahead, owed back if the visit doesn't happen. So it goes from the
// card provider's account (1580) to advances from customers (2420); a refund goes the other way.

export type Movement = { kind: "deposit" | "refund"; amountOre: number; text: string; at: string };

// What came in and went out on a day, on the clinic's clock.
export async function movementsOn(db: NodePgDatabase, business: string, day: string): Promise<Movement[]> {
  const { rows } = await db.execute<{ kind: "deposit" | "refund"; amount_ore: number; text: string; at: string }>(sql`
    SELECT 'deposit' AS kind, d.amount_ore, 'Deposit, ' || coalesce(s.title || ' ' || to_char(b.starts_at AT TIME ZONE 'Europe/Stockholm', 'DD Mon HH24:MI') || ', ' || b.name, 'no booking') AS text, d.received_at AS at
    FROM deposits d LEFT JOIN bookings b ON b.id = d.booking_id LEFT JOIN services s ON s.id = b.service
    WHERE d.business_id = ${business} AND (d.received_at AT TIME ZONE 'Europe/Stockholm')::date = ${day}
    UNION ALL
    SELECT 'refund', r.amount_ore, 'Refund, ' || d.payment_intent, r.refunded_at
    FROM refunds r JOIN deposits d ON d.id = r.deposit_id
    WHERE r.business_id = ${business} AND (r.refunded_at AT TIME ZONE 'Europe/Stockholm')::date = ${day}
    ORDER BY at`);
  return rows.map((row) => ({ kind: row.kind, amountOre: row.amount_ore, text: row.text, at: row.at }));
}

const quoted = (text: string) => '"' + text.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const kronor = (ore: number) => (ore / 100).toFixed(2);

// The file's text: a header, the two accounts, then one verification for each movement.
export function sie(name: string, day: string, movements: Movement[], made: Date): string {
  const compact = (date: string) => date.replaceAll("-", "");
  const lines = [
    "#FLAGGA 0",
    '#PROGRAM "Linden booking" 7',
    "#FORMAT PC8",
    "#GEN " + compact(fromInstant(made.toISOString()).date),
    "#SIETYP 4",
    "#FNAMN " + quoted(name),
    '#KONTO 1580 "Fordringar för kontokort och kuponger"',
    '#KONTO 2420 "Förskott från kunder"',
  ];
  movements.forEach((movement, i) => {
    const amount = movement.kind === "deposit" ? movement.amountOre : -movement.amountOre;
    lines.push(
      `#VER "B" ${i + 1} ${compact(day)} ${quoted(movement.text)}`,
      "{",
      `#TRANS 1580 {} ${kronor(amount)}`,
      `#TRANS 2420 {} ${kronor(-amount)}`,
      "}",
    );
  });
  return lines.join("\r\n") + "\r\n";
}

// The file says #FORMAT PC8: code page 437, the character set of the IBM PC from 1981, one byte for
// each character. Bytes below 128 are ASCII; these are the characters for the bytes from 128 up.
const CP437_HIGH =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00a0";
const BYTE = new Map([...CP437_HIGH].map((char, i) => [char, 128 + i]));

// The file as bytes, in code page 437. Buffer.from(text) would write UTF-8, where "ö" is two bytes that
// the accounting system reads as "├╢". A character code page 437 hasn't got (an en dash, an emoji)
// stops the file here, with its row, rather than reaching the accountant as something else.
export function encode(text: string): Buffer {
  const bytes: number[] = [];
  let row = 1;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const byte = code < 128 ? code : BYTE.get(char);
    if (byte === undefined) {
      const line = text.split("\r\n")[row - 1];
      throw new Error(
        `Row ${row} has a character code page 437 hasn't got: "${char}" (U+${code.toString(16).toUpperCase().padStart(4, "0")}), in ${line}`,
      );
    }
    if (char === "\n") row++;
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

// Talk to the accounting system's SFTP door (sftp://user:password@host:port/inbox).
function overSftp<T>(to: URL, use: (sftp: ssh2.SFTPWrapper, done: (error?: Error | null, value?: T) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    const client = new ssh2.Client();
    client
      .on("ready", () =>
        client.sftp((error, sftp) => {
          if (error) return reject(error);
          use(sftp, (useError, value) => {
            client.end();
            if (useError) reject(useError);
            else resolve(value as T);
          });
        }),
      )
      .on("error", reject)
      .connect({
        host: to.hostname,
        port: Number(to.port || 22),
        username: decodeURIComponent(to.username),
        password: decodeURIComponent(to.password),
      });
  });
}

// Send a file through the accounting system's door: SFTP, into /inbox, or HTTPS (https://host/files, with
// ACCOUNTING_TOKEN).
export async function send(url: string, name: string, bytes: Buffer): Promise<void> {
  const to = new URL(url);
  if (to.protocol === "sftp:") {
    return overSftp<void>(to, (sftp, done) =>
      sftp.writeFile(to.pathname.replace(/\/$/, "") + "/" + name, bytes, (error) => done(error)),
    );
  }
  const answer = await fetch(url.replace(/\/$/, "") + "/" + name, {
    method: "PUT",
    headers: { authorization: "Bearer " + setting("ACCOUNTING_TOKEN") },
    body: new Uint8Array(bytes),
  });
  if (!answer.ok) throw new Error("The accounting system answered " + answer.status + ": " + (await answer.text()));
}

// What the accounting system said about a file, or null while it hasn't said yet. Over SFTP the receipt
// is a text file in /outbox, next to /inbox: "ACCEPTED" or "REJECTED" on its first line.
export async function receipt(url: string, name: string): Promise<{ accepted: boolean; text: string } | null> {
  const to = new URL(url);
  if (to.protocol === "sftp:") {
    const text = await overSftp<string | null>(to, (sftp, done) =>
      sftp.readFile(to.pathname.replace(/inbox\/?$/, "outbox") + "/" + name + ".receipt.txt", (error, data) =>
        error ? done(null, null) : done(null, data.toString()),
      ),
    );
    return text === null ? null : { accepted: text.startsWith("ACCEPTED"), text: text.trim() };
  }
  const answer = await fetch(url.replace(/\/$/, "") + "/" + name + "/receipt", {
    headers: { authorization: "Bearer " + setting("ACCOUNTING_TOKEN") },
  });
  if (answer.status === 404) return null;
  if (!answer.ok) throw new Error("The accounting system answered " + answer.status);
  const body = await answer.json();
  return { accepted: body.status === "accepted", text: JSON.stringify(body) };
}

// Yesterday on the clinic's clock: at 02:00 in Stockholm, the day that just ended.
export function yesterday(now: Date): string {
  const d = new Date(fromInstant(now.toISOString()).date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Every night: a job to send yesterday's file, for each business that takes deposits. Or, by hand, a
// given day's file again: its key is new, so it isn't taken for the night's job.
export async function queueFiles(now = new Date(), again?: string) {
  const day = again ?? yesterday(now);
  const taking = await db()
    .selectDistinct({ id: businesses.id })
    .from(businesses)
    .innerJoin(services, and(eq(services.businessId, businesses.id), gt(services.depositSek, 0)));
  for (const { id } of taking) {
    await enqueue(db(), {
      business: id,
      kind: "accounting-file",
      payload: { day },
      key: "accounting-" + id + "-" + day + (again ? "-again-" + now.getTime() : ""),
    });
  }
  return taking.length;
}

// The job: make the day's file and send it.
export async function sendFile(job: Job) {
  const day = job.payload.day;
  const [business] = await db().select().from(businesses).where(eq(businesses.id, job.business));
  const name = business.id + "-" + day.replaceAll("-", "") + ".se";
  const bytes = encode(sie(business.name, day, await movementsOn(db(), business.id, day), new Date()));
  await send(setting("ACCOUNTING_URL"), name, bytes);
  log("info", "accounting file sent", { business: business.id, day, name, bytes: bytes.length });
  await db()
    .insert(exports)
    .values({ businessId: business.id, day, name, sentAt: new Date().toISOString(), status: "sent" })
    .onConflictDoUpdate({
      target: [exports.businessId, exports.day],
      set: { name, sentAt: new Date().toISOString(), status: "sent", receipt: null },
    });
  // Sent is not booked: the accounting system checks the file after it arrives. Come back for its
  // receipt in a little while (and later, if it isn't there yet).
  await enqueue(db(), {
    business: business.id,
    kind: "accounting-receipt",
    payload: { day, name },
    key: "receipt-" + job.id,
    runAt: new Date(Date.now() + 5_000),
  });
}

// The job: read the receipt and record what it says. No receipt yet is a failure, so the job is tried
// again later, as any failed job is.
export async function readReceipt(job: Job) {
  const said = await receipt(setting("ACCOUNTING_URL"), job.payload.name);
  if (!said) throw new Error("No receipt yet for " + job.payload.name);
  log(said.accepted ? "info" : "error", said.accepted ? "accounting file booked" : "accounting file rejected", {
    business: job.business,
    day: job.payload.day,
    receipt: said.text,
  });
  await db()
    .update(exports)
    .set({ status: said.accepted ? "accepted" : "rejected", receipt: said.text })
    .where(and(eq(exports.businessId, job.business), eq(exports.day, job.payload.day)));
  if (!said.accepted) {
    await fileAlert(job.business, job.payload.day, "The accounting system rejected it: " + said.text);
  }
}
