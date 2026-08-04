import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada no ambiente do servidor");
}

const globalForDb = globalThis as typeof globalThis & {
  __locadoraDbPool?: mysql.Pool;
};

export const pool =
  globalForDb.__locadoraDbPool ??
  mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    waitForConnections: true,
    maxIdle: 5,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    decimalNumbers: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__locadoraDbPool = pool;
}

export const db = drizzle({ client: pool, schema, mode: "default" });
