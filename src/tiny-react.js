// A tiny React: describe the page, compare with the last description, change only what differs.

// JSX turns <button className="picked">15:00</button> into a call to this function.
export function jsx(type, props, key) {
  return { type, props, key };
}
export { jsx as jsxs, jsx as jsxDEV };
export const Fragment = (props) => props.children;

// State lives in the component's hooks list, which is kept between renders.
let hooks, next, rerender;
export function useState(initial) {
  const list = hooks, i = next++;
  if (!(i in list)) list[i] = typeof initial === "function" ? initial() : initial;
  const set = (value) => {
    list[i] = typeof value === "function" ? value(list[i]) : value;
    rerender();
  };
  return [list[i], set];
}

// Lists, null and false flatten away; text becomes a text node.
function flat(children) {
  return [children].flat(Infinity).filter((c) => c != null && c !== false && c !== true)
    .map((c) => (typeof c === "object" ? c : { type: "#text", props: { nodeValue: String(c) } }));
}

// Compare the new children with the old ones. Same key (or same place) and same type: keep the node.
function update(olds, children) {
  const byKey = new Map(olds.map((old, i) => [old.el.key ?? i, old]));
  const kids = flat(children).map((el, i) => {
    const old = byKey.get(el.key ?? i);
    if (old && old.el.type === el.type) { byKey.delete(el.key ?? i); return patch(old, el); }
    return patch({ el: { props: {} }, kids: [], hooks: [] }, el);
  });
  for (const old of byKey.values()) doms(old).forEach((node) => node.remove());
  return kids;
}

function patch(node, el) {
  const old = node.el.props;
  node.el = el;
  if (typeof el.type === "function") {          // a component: call it with its own hooks
    hooks = node.hooks; next = 0;
    node.kids = update(node.kids, el.type(el.props));
    return node;
  }
  node.dom ??= el.type === "#text" ? new Text() : document.createElement(el.type);
  for (const name of new Set([...Object.keys(old), ...Object.keys(el.props)])) {
    if (name !== "children" && old[name] !== el.props[name]) setProp(node.dom, name, el.props[name]);
  }
  if (el.type !== "#text") place(node.dom, (node.kids = update(node.kids, el.props.children)));
  return node;
}

function setProp(dom, name, value) {
  if (name.startsWith("on")) {                  // onClick -> "click"; onChange -> "input"
    const type = name === "onChange" ? "input" : name.slice(2).toLowerCase();
    dom.handlers ??= {};
    if (!dom.handlers[type]) dom.addEventListener(type, (e) => dom.handlers[type](e));
    dom.handlers[type] = value;
  } else if (name in dom) dom[name] = value ?? "";
  else if (value == null) dom.removeAttribute(name);
  else dom.setAttribute(name, value);
}

// Put the DOM nodes in order, moving only those that are out of place.
const doms = (node) => (node.dom ? [node.dom] : node.kids.flatMap(doms));
function place(parent, kids) {
  kids.flatMap(doms).forEach((dom, i) => {
    if (parent.childNodes[i] !== dom) parent.insertBefore(dom, parent.childNodes[i] ?? null);
  });
}

export function createRoot(container) {
  let kids = [];
  return {
    render(el) {
      rerender = () => place(container, (kids = update(kids, el)));
      rerender();
    },
  };
}
