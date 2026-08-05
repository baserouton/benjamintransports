import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

/** Serve uploads/ no Vite dev (produção usa src/server.ts). */
function uploadsStaticPlugin(): Plugin {
  const root = path.resolve(__dirname, "uploads");
  return {
    name: "uploads-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/uploads/")) return next();
        const relative = decodeURIComponent(req.url.slice("/uploads/".length).split("?")[0] ?? "");
        if (!relative || relative.includes("..")) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        const filePath = path.resolve(root, relative);
        if (!filePath.startsWith(root + path.sep)) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        const stream = fs.createReadStream(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".gif"
                ? "image/gif"
                : "image/jpeg";
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        stream.pipe(res);
      });
    },
  };
}

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
    uploadsStaticPlugin(),
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
  ],
}));
