import "server-only";
import { headers } from "next/headers";
import { cacheLife } from "next/cache";
import { clinic } from "../server/clinic.ts";

// The business this request is for. proxy.ts works it out from the address the browser asked for,
// before anything else runs, and passes it on in this header.
export async function here(): Promise<string> {
  const business = (await headers()).get("x-business");
  if (!business) throw new Error("No business for this request: is proxy.ts running for this path?");
  return business;
}

// The one way into the data of the business this request is for.
export async function clinicHere() {
  return clinic(await here());
}

// A business's name, contact address and how its staff sign in. They change rarely: kept for an hour.
export async function about(business: string) {
  "use cache";
  cacheLife("hours");
  return clinic(business).about();
}
