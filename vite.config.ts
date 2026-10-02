import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@yogeshhrathod/qivi": root("./library/qivi/src/index.ts") } },
  // The redesigned showcase is built alongside the current one at /next/ until it replaces it.
  build: { rollupOptions: { input: { main: root("./index.html"), next: root("./next/index.html") } } },
});
