// Server components, rendered into a payload: one row per line, "id:value". Row 0 is the page.
const ELEMENT = Symbol.for("react.transitional.element");

export async function render(tree, send) {
  const write = (id, value) => send(id.toString(16) + ":" + value + "\n");

  async function encode(node) {
    if (node === null || node === undefined || typeof node === "boolean") return null;
    if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
    if (typeof node === "number") return node;
    if (typeof node === "symbol") return "$S" + Symbol.keyFor(node);
    if (Array.isArray(node)) return Promise.all(node.map(encode));
    if (node.$$typeof === ELEMENT) {
      const { type, key, props } = node;
      if (typeof type === "function") {
        // A server component: run it here, and wait for it. Only what it returns goes to the browser.
        return encode(await type(props));
      }
      return ["$", await encode(type), key, await encode(props)];
    }
    const entries = await Promise.all(Object.entries(node).map(async ([name, value]) => [name, await encode(value)]));
    return Object.fromEntries(entries);
  }

  write(0, JSON.stringify(await encode(tree)));
}
