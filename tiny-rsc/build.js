import { build } from "esbuild";

// The browser's code: client.jsx and React.
await build({
  entryPoints: ["client.jsx"],
  bundle: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  outfile: "public/client.js",
  define: { "process.env.NODE_ENV": '"production"' },
});
console.log("Built public/client.js");
