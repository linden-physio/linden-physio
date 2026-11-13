import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { stdin } from "node:process";
import { createInterface } from "node:readline/promises";
import { staff } from "./schema.ts";
import { hashPassword } from "./passwords.ts";
import { setting } from "./env.ts";

// `npm run set-password -- karin@lindenphysio.com` asks for a new password and stores its hash. The
// password itself is never written anywhere.
const email = process.argv[2];
if (!email) throw new Error("Usage: npm run set-password -- <email>");
const lines = createInterface({ input: stdin });
console.log("New password for " + email + ":");
const password = (await lines[Symbol.asyncIterator]().next()).value ?? "";
lines.close();
if (password.length < 12) throw new Error("Use at least 12 characters.");
const db = drizzle(setting("DATABASE_URL"));
const changed = await db
  .update(staff)
  .set({ passwordHash: await hashPassword(password) })
  .where(eq(staff.email, email))
  .returning({ id: staff.id });
await db.$client.end();
console.log(changed.length ? "Password set." : "No member of staff has that address.");
