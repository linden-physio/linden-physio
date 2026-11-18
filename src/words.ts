import "server-only";
import { draftMode, headers } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";

// The words on a business's booking page, from the CMS (Payload, src/payload.config.ts): the line under
// its name, and a line about each service. Where the CMS has nothing, the page keeps the words in our
// own tables.
export type Words = { welcome: string | null; services: Record<string, string> };

async function fromCms(business: string, draft: boolean): Promise<Words> {
  const payload = await getPayload({ config });
  const where = { business: { equals: business } };
  // draft: the newest version, saved or published. Otherwise only what has been published.
  const [welcome, services] = await Promise.all([
    payload.find({ collection: "welcome", where, limit: 1, draft }),
    payload.find({ collection: "service-texts", where, limit: 100, draft }),
  ]);
  return {
    welcome: welcome.docs[0]?.line ?? null,
    services: Object.fromEntries(services.docs.map((doc) => [doc.service, doc.line])),
  };
}

// Kept until something is published: then the CMS forgets them, by their tag (see payload.config.ts).
async function published(business: string): Promise<Words> {
  "use cache";
  cacheLife("max");
  cacheTag("content");
  return fromCms(business, false);
}

// The published words, or, for staff previewing a draft from the editor, the newest saved ones.
export async function wordsFor(business: string): Promise<Words> {
  // The headers first: they tell Next that this runs for each request.
  await headers();
  if ((await draftMode()).isEnabled) return fromCms(business, true);
  return published(business);
}
