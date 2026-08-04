import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadDotenv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const envPath = resolve(projectRoot, ".env");
const entry = resolve(projectRoot, ".output/server/index.mjs");

if (existsSync(envPath)) {
  const result = loadDotenv({ path: envPath, override: false });
  if (result.error) {
    console.error(`[start] Falha ao ler ${envPath}:`, result.error.message);
  } else {
    const count = Object.keys(result.parsed ?? {}).length;
    console.log(`[start] .env carregado (${count} vars) de ${envPath}`);
  }
} else {
  console.warn(
    `[start] Arquivo .env nao encontrado em ${envPath}. Usando somente process.env.`,
  );
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[start] DATABASE_URL nao definida. Configure no .env (ou nas variaveis do PM2/systemd) antes de iniciar.",
  );
  process.exit(1);
}

if (!process.env.NITRO_PORT && !process.env.PORT) {
  process.env.PORT = "3000";
}
if (!process.env.NITRO_HOST && !process.env.HOST) {
  process.env.HOST = "0.0.0.0";
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const port = process.env.NITRO_PORT ?? process.env.PORT;
const host = process.env.NITRO_HOST ?? process.env.HOST;

console.log(
  `[start] Iniciando Locadora Admin em http://${host}:${port} (NODE_ENV=${process.env.NODE_ENV})`,
);

process.on("uncaughtException", (error) => {
  console.error("[start] uncaughtException:", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("[start] unhandledRejection:", reason);
});
process.on("SIGTERM", () => {
  console.log("[start] SIGTERM recebido, encerrando...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("[start] SIGINT recebido, encerrando...");
  process.exit(0);
});
process.on("exit", (code) => {
  console.log(`[start] processo encerrando com codigo ${code}`);
});

if (!existsSync(entry)) {
  console.error(
    `[start] Build nao encontrado em ${entry}. Rode 'npm run build' antes.`,
  );
  process.exit(1);
}

try {
  await import(pathToFileURL(entry).href);
  console.log("[start] Servidor iniciado. Aguardando conexoes...");
} catch (error) {
  console.error("[start] Falha ao iniciar o servidor Nitro:", error);
  process.exit(1);
}
