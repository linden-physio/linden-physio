import { build } from "esbuild";
import { readdirSync, readFileSync } from "node:fs";

// The browser's code: client.jsx, and every "use client" file, listed by name so that a row like
// I["/app/Booking.jsx","Booking"] can find it.
const files = readdirSync("app").filter((file) => /^["']use client["']/.test(readFileSync("app/" + file, "utf8")));
const modules = `${files.map((f, i) => `import * as m${i} from "./app/${f}";`).join("\n")}
export const modules = { ${files.map((f, i) => `"/app/${f}": m${i}`).join(", ")} };`;

await build({
  entryPoints: ["client.jsx"],
  bundle: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  outfile: "public/client.js",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "modules",
      setup(b) {
        b.onResolve({ filter: /^client-modules$/ }, () => ({ path: "client-modules", namespace: "modules" }));
        b.onLoad({ filter: /.*/, namespace: "modules" }, () => ({ contents: modules, resolveDir: ".", loader: "js" }));
      },
    },
  ],
});
console.log("Built public/client.js with " + files.join(", "));
