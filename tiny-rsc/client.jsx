import { createElement } from "react";
import { createRoot } from "react-dom/client";

// Turn the payload's data back into what React renders.
function decode(value) {
  if (typeof value === "string") {
    if (value.startsWith("$$")) return value.slice(1);
    if (value.startsWith("$S")) return Symbol.for(value.slice(2));
    return value;
  }
  if (Array.isArray(value)) {
    if (value[0] !== "$") return value.map(decode);
    const [, type, key, props] = value;
    return createElement(decode(type), { ...decode(props), key });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, v]) => [name, decode(v)]));
  }
  return value;
}

// Ask the page's server for the payload, and read row 0.
async function load(address) {
  const response = await fetch(address, { headers: { RSC: "1" } });
  const text = await response.text();
  const row = text.split("\n").find((line) => line.startsWith("0:"));
  return decode(JSON.parse(row.slice(2)));
}

const root = createRoot(document.getElementById("root"));
root.render(await load(location.href));
