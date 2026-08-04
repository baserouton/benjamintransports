import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: true,
    port: 8080,
  },
  plugins: [
    tanstackStart({
      // Custom SSR entry with catastrophic error recovery (src/server.ts).
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
  ],
}));
