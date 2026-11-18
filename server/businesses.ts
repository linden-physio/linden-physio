import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { businesses } from "./schema.ts";

// The business whose pages are at an address, from the Host the browser asked for, like
// "thebirchhairstudio.com" or "birch.localhost:5173". An address no business has (a Vercel preview,
// say) is Linden Physio's, the first business.
export async function businessFor(db: NodePgDatabase, host: string | null): Promise<string> {
  const name = (host ?? "").toLowerCase().replace(/:\d+$/, "");
  const [row] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(sql`${name} = ANY(${businesses.hosts})`);
  return row?.id ?? "linden";
}
