import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The React Compiler, as in vite.config.ts: it remembers what each component worked out, so we don't have to.
  reactCompiler: true,
  // Cache Components: nothing is kept between requests unless the code says "use cache", and the parts
  // of a page that can be made ahead of time are made at build time, with the rest streamed in.
  cacheComponents: true,
  // Links fetch the parts of a page that don't depend on its address ahead of time, once per route.
  partialPrefetching: true,
};

export default nextConfig;
