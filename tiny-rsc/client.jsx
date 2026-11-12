import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { modules } from "client-modules";

// Ask the page's server for the payload, keep each row by its id, and rebuild row 0.
async function load(address) {
  const rows = new Map();
  const decode = (value) => {
    if (typeof value === "string") {
      if (value.startsWith("$$")) return value.slice(1);
      if (value.startsWith("$S")) return Symbol.for(value.slice(2));
      if (value.startsWith("$L")) return rows.get(value.slice(2));
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
  };

  const response = await fetch(address, { headers: { RSC: "1" } });
  for (const line of (await response.text()).split("\n").filter(Boolean)) {
    const colon = line.indexOf(":");
    const id = line.slice(0, colon);
    const text = line.slice(colon + 1);
    if (text.startsWith("I")) {
      // A client component: find its code in the browser's bundle, by file and export.
      const [file, name] = JSON.parse(text.slice(1));
      rows.set(id, modules[file][name]);
    } else {
      rows.set(id, decode(JSON.parse(text)));
    }
  }
  return rows.get("0");
}

const root = createRoot(document.getElementById("root"));
root.render(await load(location.href));
