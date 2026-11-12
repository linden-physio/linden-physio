import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { setting } from "./env.ts";

// The clinic's database, opened the first time something asks for it. (Not when the file is loaded:
// next build loads every file, on computers that have no database.)
let opened: NodePgDatabase | null = null;
export function db(): NodePgDatabase {
  opened ??= drizzle(setting("DATABASE_URL"));
  return opened;
}
