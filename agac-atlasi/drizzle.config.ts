import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL gerekli (.env dosyasına ekleyin)");
}

const url = new URL(connectionString);
const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // TiDB Cloud yalnızca TLS ile bağlantı kabul eder
    ssl: isLocal ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
  },
});
