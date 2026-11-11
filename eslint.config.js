import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist", "public/mockServiceWorker.js"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // A label that wraps the kit's RadioGroupItem is labelling a control.
      "jsx-a11y/label-has-associated-control": ["error", { controlComponents: ["RadioGroupItem"], depth: 3 }],
    },
  },
  {
    // The kit's Label passes htmlFor through from whoever uses it.
    files: ["src/components/ui/label.tsx"],
    rules: { "jsx-a11y/label-has-associated-control": "off" },
  },
]);
