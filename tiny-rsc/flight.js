// Server components, rendered into a payload: one row per line, "id:value". Row 0 is the page.
const CLIENT = Symbol.for("react.client.reference");
const ELEMENT = Symbol.for("react.transitional.element");

export async function render(tree, send) {
  let rows = 1;
  const clientRows = new Map();
  const write = (id, value) => send(id.toString(16) + ":" + value + "\n");

  // A component the browser runs: a row that says where its code is, written once.
  function clientRow({ id, name }) {
    const key = id + "#" + name;
    if (!clientRows.has(key)) {
      clientRows.set(key, rows);
      write(rows++, "I" + JSON.stringify([id, name]));
    }
    return "$L" + clientRows.get(key).toString(16);
  }

  async function encode(node) {
    if (node === null || node === undefined || typeof node === "boolean") return null;
    if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
    if (typeof node === "number") return node;
    if (typeof node === "symbol") return "$S" + Symbol.keyFor(node);
    if (typeof node === "function") {
      throw new Error(`Functions cannot be passed to client components: ${node.name || "a function"}`);
    }
    if (Array.isArray(node)) return Promise.all(node.map(encode));
    if (node.$$typeof === CLIENT) return clientRow(node);
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
