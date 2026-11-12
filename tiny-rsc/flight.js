// Server components, rendered into a payload: one row per line, "id:value". Row 0 is the page.
// A part that isn't ready yet is written as "$L" and the number of a row that comes later.
const CLIENT = Symbol.for("react.client.reference");
const ELEMENT = Symbol.for("react.transitional.element");

export function render(tree, send) {
  let rows = 1;
  let waiting = 0;
  let finish;
  const finished = new Promise((resolve) => (finish = resolve));
  const clientRows = new Map();
  const write = (id, value) => send(id.toString(16) + ":" + value + "\n");

  // A server component that is still waiting: keep a row for it, and write the row when it's done.
  function later(promise) {
    const id = rows++;
    waiting++;
    promise.then((value) => {
      write(id, JSON.stringify(encode(value)));
      if (--waiting === 0) finish();
    });
    return "$L" + id.toString(16);
  }

  // A component the browser runs: a row that says where its code is, written once.
  function clientRow({ id, name }) {
    const key = id + "#" + name;
    if (!clientRows.has(key)) {
      clientRows.set(key, rows);
      write(rows++, "I" + JSON.stringify([id, name]));
    }
    return "$L" + clientRows.get(key).toString(16);
  }

  function encode(node) {
    if (node === null || node === undefined || typeof node === "boolean") return null;
    if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
    if (typeof node === "number") return node;
    if (typeof node === "symbol") return "$S" + Symbol.keyFor(node);
    if (typeof node === "function") {
      throw new Error(`Functions cannot be passed to client components: ${node.name || "a function"}`);
    }
    if (Array.isArray(node)) return node.map(encode);
    if (node.$$typeof === CLIENT) return clientRow(node);
    if (node.$$typeof === ELEMENT) {
      const { type, key, props } = node;
      if (typeof type === "function") {
        // A server component: run it here. Only what it returns goes to the browser.
        const output = type(props);
        return output instanceof Promise ? later(output) : encode(output);
      }
      return ["$", encode(type), key, encode(props)];
    }
    return Object.fromEntries(Object.entries(node).map(([name, value]) => [name, encode(value)]));
  }

  write(0, JSON.stringify(encode(tree)));
  if (waiting === 0) finish();
  return finished;
}
