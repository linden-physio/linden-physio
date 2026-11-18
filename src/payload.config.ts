import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig, type CollectionConfig, type CollectionAfterChangeHook, type Field } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { revalidateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "../server/auth.ts";
import { db } from "../server/db.ts";
import { staff } from "../server/schema.ts";
import { businessFor } from "../server/businesses.ts";
import { may } from "../server/permissions.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Payload, a headless CMS, inside our own app: its editor is at /cms, its tables are in the same
// Postgres, in a schema of their own ("payload"). It holds the words on the booking page, which Karin
// changes without asking Sam for a pull request. Prices stay in our own tables: a booking owns them.

// When a text is published, the pages that show it forget their kept copy (the "content" tag, as in
// film 35), so the next visit gets the new words, not the next deploy. { expire: 0 }: the next visit
// waits for fresh words instead of being shown the old ones once more.
const forgetKeptWords: CollectionAfterChangeHook = ({ doc }) => {
  if (doc._status === "published") revalidateTag("content", { expire: 0 });
  return doc;
};

// Each business sees and edits only its own texts.
const ownBusiness = ({ req }: { req: { user?: unknown } }) => {
  const user = req.user as { business?: string } | null | undefined;
  return user?.business ? { business: { equals: user.business } } : false;
};

const business: Field = {
  name: "business",
  type: "select",
  required: true,
  options: [
    { label: "Linden Physio", value: "linden" },
    { label: "Birch Hair Studio", value: "birch" },
  ],
  // Filled in from who is signed in, and not shown.
  admin: { hidden: true },
  hooks: {
    beforeValidate: [({ req, value }) => value ?? (req.user as { business?: string } | null)?.business],
  },
};

const versions = { drafts: true, maxPerDoc: 20 };
// The editor's Preview button: the booking page, with the draft.
const preview = () => "/preview";

const Welcome: CollectionConfig = {
  slug: "welcome",
  labels: { singular: "Welcome text", plural: "Welcome text" },
  admin: { useAsTitle: "line", description: "The line under the business's name on the booking page.", preview },
  access: { read: ownBusiness, create: ownBusiness, update: ownBusiness, delete: () => false },
  versions,
  fields: [business, { name: "line", type: "textarea", required: true }],
  hooks: { afterChange: [forgetKeptWords] },
};

const ServiceTexts: CollectionConfig = {
  slug: "service-texts",
  labels: { singular: "Service text", plural: "Service texts" },
  admin: { useAsTitle: "service", description: "What the booking page says about each service.", preview },
  access: { read: ownBusiness, create: ownBusiness, update: ownBusiness, delete: ownBusiness },
  versions,
  fields: [
    business,
    // The service's id in our own tables, like "follow-up".
    { name: "service", type: "text", required: true, unique: true },
    { name: "line", type: "textarea", required: true },
  ],
  hooks: { afterChange: [forgetKeptWords] },
};

// Who may use the editor: the staff who may change the words, signed in the way they always do (with
// Microsoft at Linden, by an email link at Birch). Payload has no passwords of its own here: it asks
// Better Auth who is signed in, and keeps a row for each of them.
const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email", hidden: true },
  auth: {
    disableLocalStrategy: true,
    strategies: [
      {
        name: "staff",
        authenticate: async ({ headers, payload }) => {
          const session = await auth().api.getSession({ headers });
          if (!session) return { user: null };
          const at = await businessFor(db(), headers.get("host"));
          const [member] = await db()
            .select({ id: staff.id, role: staff.role })
            .from(staff)
            .where(and(eq(staff.email, session.user.email.toLowerCase()), eq(staff.businessId, at)));
          if (!member || !may(member, { do: "edit the words" })) return { user: null };
          const email = session.user.email.toLowerCase();
          const found = await payload.find({ collection: "users", where: { email: { equals: email } }, limit: 1 });
          const user = found.docs[0] ?? (await payload.create({ collection: "users", data: { email, business: at } }));
          return { user: { ...user, collection: "users" } };
        },
      },
    ],
  },
  fields: [
    { name: "email", type: "email", required: true, unique: true },
    { name: "business", type: "text", required: true },
  ],
};

export default buildConfig({
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  // /api is our own API's (server/routes.ts), so Payload's is at /cms-api.
  routes: { admin: "/cms", api: "/cms-api" },
  admin: { user: "users", meta: { titleSuffix: " · Words on the site" } },
  collections: [Welcome, ServiceTexts, Users],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    schemaName: "payload",
    // Its tables are made by its own migrations (npm run migrate), never pushed from the config.
    push: false,
    migrationDir: path.resolve(dirname, "../server/payload-migrations"),
  }),
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  telemetry: false,
});
