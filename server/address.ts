// The internet address a request came from. On Vercel, its edge writes x-real-ip and x-forwarded-for
// itself, over whatever the request said, so the address is the one that connected. Anywhere else
// anyone can write these headers: there, run behind a proxy that does the same.
export function addressOf(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// The address the request was sent to, like https://lindenphysio.com or http://birch.localhost:5173,
// for links back to it. Vercel says which protocol in x-forwarded-proto; this computer speaks plain http.
export function originOf(headers: Headers): string {
  const host = headers.get("host") ?? "localhost";
  const local = /^([a-z0-9-]+\.)?localhost(:\d+)?$/.test(host);
  return (headers.get("x-forwarded-proto") ?? (local ? "http" : "https")) + "://" + host;
}
