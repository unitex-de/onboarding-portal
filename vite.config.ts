import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Wir zwingen das integrierte Tailwind-Plugin, unsere neue Datei zu lesen
  plugins: [
    tailwindcss({
      base: "src/unitex.css",
    }),
  ],
});