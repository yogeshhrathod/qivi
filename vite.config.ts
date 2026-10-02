import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "qivi": new URL("./library/qivi/src/index.ts", import.meta.url).pathname } },
});
