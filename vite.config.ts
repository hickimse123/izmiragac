import devServer from "@hono/vite-dev-server";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Yerelde (npm run dev) backend'i Vite içinde çalıştırır; yalnızca /api/* isteklerini karşılar.
    devServer({ entry: "server/app.ts", exclude: [/^\/(?!api\/).*$/] }),
    react(),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      db: path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
