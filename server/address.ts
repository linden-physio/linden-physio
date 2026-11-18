// The internet address a request came from. On Vercel, its edge writes x-real-ip and x-forwarded-for
// itself, over whatever the request said, so the address is the one that connected. Anywhere else
// anyone can write these headers: there, run behind a proxy that does the same.
export function addressOf(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
