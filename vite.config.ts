import { defineConfig } from "vite";

// React, react-dom and the JSX runtime all come from our own file.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  resolve: {
    alias: [{ find: /^react(-dom\/client|\/jsx-dev-runtime|\/jsx-runtime)?$/, replacement: "/src/tiny-react.js" }],
  },
});
