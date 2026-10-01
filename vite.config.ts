import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: '/curriculum-vitae-builder/',
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
