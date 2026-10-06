import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env.js";
import * as schema from "../../db/schema.js";
import * as relations from "../../db/relations.js";

const fullSchema = { ...schema, ...relations };

function createPool() {
  const url = new URL(env.databaseUrl);
  const host = url.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  // TiDB Cloud yalnızca TLS ile bağlantı kabul eder. Yerel MySQL için SSL kapalı.
  const useSsl = !isLocal && url.searchParams.get("ssl") !== "false";

  return mysql.createPool({
    host,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: useSsl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 3, // serverless: örnek başına az bağlantı
    maxIdle: 3,
    idleTimeout: 30_000,
    enableKeepAlive: true,
  });
}

function createDb() {
  return drizzle(createPool(), {
    // TiDB, LATERAL JOIN desteklemez → "planetscale" modu ilişkisel sorgularda güvenlidir
    mode: "planetscale",
    schema: fullSchema,
  });
}

let instance: ReturnType<typeof createDb> | undefined;

export function getDb() {
  instance ??= createDb();
  return instance;
}
