import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Outputs a Single-Page Application (SPA).
  distDir: "./dist", // Changes the build output directory to `./dist/`.
  // The React Compiler, as in vite.config.ts: it remembers what each component worked out, so we don't have to.
  reactCompiler: true,
};

export default nextConfig;
