import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { withPayload } from "@payloadcms/next/withPayload";

// The commit this build is made from: Vercel says which; on this computer, ask git.
function release() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  // The React Compiler, as in vite.config.ts: it remembers what each component worked out, so we don't have to.
  reactCompiler: true,
  // Cache Components: nothing is kept between requests unless the code says "use cache", and the parts
  // of a page that can be made ahead of time are made at build time, with the rest streamed in.
  cacheComponents: true,
  // Links fetch the parts of a page that don't depend on its address ahead of time, once per route.
  partialPrefetching: true,
  // ssh2 (the SFTP client for the accounting file) loads a compiled add-on, which the bundler can't
  // pack: leave it to Node.
  serverExternalPackages: ["ssh2"],
  // Write a source map next to each script for the browser, so an error's stack from a real browser can
  // be read as lines of our own files (server/browserErrors.ts). They are served with the scripts, so
  // anyone can read the source they map to: ours is public on GitHub anyway. A closed-source team uploads
  // them to its error service instead, and deletes them from the build.
  productionBrowserSourceMaps: true,
  // Pages report errors with the commit they were built from.
  env: { NEXT_PUBLIC_RELEASE: release() },
};

// withPayload adds what Payload's editor needs to be built with the app.
export default withPayload(nextConfig);
