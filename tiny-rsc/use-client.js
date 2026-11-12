import { transform } from "esbuild";

// A Node module hook. In .jsx files, JSX is turned into calls, as Vite did for the browser.
export async function load(url, context, nextLoad) {
  if (!url.endsWith(".jsx")) return nextLoad(url, context);
  const { source } = await nextLoad(url, { ...context, format: "module" });
  const { code: js } = await transform(String(source), { loader: "jsx", jsx: "automatic", format: "esm" });
  return { format: "module", source: js, shortCircuit: true };
}
