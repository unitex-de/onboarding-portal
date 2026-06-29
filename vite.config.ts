import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";  // NEU

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    plugins: [
      nitro(),  // NEU
      tailwindcss({
        config: {
          content: ["src/unitex.css"],
        },
      } as any),
    ],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});