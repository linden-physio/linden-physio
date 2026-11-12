import { createElement, use } from "react";
import { createRoot } from "react-dom/client";
import { modules } from "client-modules";

// Read a payload as it arrives, a line at a time, and keep each row by its id. A row that hasn't
// arrived yet is a promise, which resolves when its line comes.
async function load(address) {
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      rows.set(id, { promise, resolve });
    }
    return rows.get(id);
  };
  const decode = (value) => {
    if (typeof value === "string") {
      if (value.startsWith("$$")) return value.slice(1);
      if (value.startsWith("$S")) return Symbol.for(value.slice(2));
      if (value.startsWith("$L")) {
        const r = row(value.slice(2));
        if ("value" in r) return r.value;
        return createElement(Later, { promise: r.promise });
      }
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
  // A part of the page that hasn't arrived: use() waits for its row, and Suspense shows the fallback.
  function Later({ promise }) {
    return use(promise);
  }

  const response = await fetch(address, { headers: { RSC: "1" } });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  (async () => {
    let buffer = "";
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
      buffer += read.value;
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const colon = line.indexOf(":");
        const id = line.slice(0, colon);
        const text = line.slice(colon + 1);
        const value = text.startsWith("I")
          ? modules[JSON.parse(text.slice(1))[0]][JSON.parse(text.slice(1))[1]]
          : decode(JSON.parse(text));
        row(id).value = value;
        row(id).resolve(value);
      }
    }
  })();
  return row("0").promise;
}

const root = createRoot(document.getElementById("root"));
root.render(await load(location.href));

// A click on a link to this page asks for just the payload for the new address.
document.addEventListener("click", async (event) => {
  const link = event.target.closest("a");
  if (!link || link.origin !== location.origin) return;
  event.preventDefault();
  history.pushState(null, "", link.href);
  root.render(await load(link.href));
});
addEventListener("popstate", async () => root.render(await load(location.href)));
