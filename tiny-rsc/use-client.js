import { transform } from "esbuild";

const root = new URL("./", import.meta.url).href;

// A Node module hook. A file that starts with "use client" belongs to the browser: on the server, each
// of its exports becomes a note that says which file and which export it is. Other .jsx files have
// their JSX turned into calls, as Vite did for the browser.
export async function load(url, context, nextLoad) {
  if (!url.endsWith(".jsx")) return nextLoad(url, context);
  const { source } = await nextLoad(url, { ...context, format: "module" });
  const code = String(source);
  if (/^["']use client["']/.test(code)) {
    const id = "/" + url.slice(root.length);
    const names = [...code.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map((m) => m[1]);
    const notes = names.map(
      (name) =>
        `export const ${name} = { $$typeof: Symbol.for("react.client.reference"), id: "${id}", name: "${name}" };`,
    );
    return { format: "module", source: notes.join("\n"), shortCircuit: true };
  }
  const { code: js } = await transform(code, { loader: "jsx", jsx: "automatic", format: "esm" });
  return { format: "module", source: js, shortCircuit: true };
}
