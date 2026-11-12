/// <reference types="vite/client" />

// The VITE_ variables the page reads. Each one ends up in the JavaScript every visitor downloads.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
