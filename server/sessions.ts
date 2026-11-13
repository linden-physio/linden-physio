import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sessions, staff } from "./schema.ts";
import { checkPassword } from "./passwords.ts";
import { db } from "./db.ts";

// A session lasts a week, then the person signs in again.
const week = 7 * 24 * 60 * 60 * 1000;

// What the rest of the app knows about whoever is signed in.
export type Staff = { id: number; name: string; email: string };

// The token is random, so a fast hash is enough to store it: there is nothing to guess. (A password is
// chosen by a person, so it gets the slow one, in passwords.ts.)
const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

// Signing in and out, with the given database. now() is the time; the tests give it a fixed one.
export function makeSessions(db: NodePgDatabase, now: () => Date = () => new Date()) {
  // The member of staff with this address and password, or null. The same answer for a wrong address
  // as for a wrong password, so the form can't be used to find out who works here.
  async function checkSignIn(email: string, password: string): Promise<Staff | null> {
    const [row] = await db.select().from(staff).where(eq(staff.email, email.trim().toLowerCase()));
    if (!row?.passwordHash || !row.email) return null;
    if (!(await checkPassword(password, row.passwordHash))) return null;
    return { id: row.id, name: row.name, email: row.email };
  }

  // A new session for a member of staff. The token goes in the cookie; only its hash is stored.
  async function start(staffId: number): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + week);
    await db.insert(sessions).values({ tokenHash: hashOf(token), staffId, expiresAt: expiresAt.toISOString() });
    return { token, expiresAt };
  }

  // Whoever the token belongs to, if its session hasn't run out, or null.
  async function find(token: string): Promise<Staff | null> {
    const [row] = await db
      .select({ id: staff.id, name: staff.name, email: staff.email })
      .from(sessions)
      .innerJoin(staff, eq(sessions.staffId, staff.id))
      .where(and(eq(sessions.tokenHash, hashOf(token)), gt(sessions.expiresAt, now().toISOString())));
    return row ? { ...row, email: row.email ?? "" } : null;
  }

  async function end(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashOf(token)));
  }

  return { checkSignIn, start, find, end };
}

// Sessions in the clinic's database.
export const clinicSessions = () => makeSessions(db());
