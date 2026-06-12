import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  // Wir zwingen das integrierte Tailwind-Plugin, unsere neue Datei zu lesen
  plugins: [
    tailwindcss({
      config: {
        content: ["src/unitex.css"],
      },
    } as any),
  ],
});