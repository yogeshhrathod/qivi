import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser calls /session on its own origin; Vite forwards it to server.mjs,
// which is the only place OPENAI_API_KEY exists.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/session": "http://localhost:3001" } },
});
