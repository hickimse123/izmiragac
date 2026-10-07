import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { runAutoBatch } from "./lib/species-auto.js";

const app = new Hono();

// Vercel fonksiyonlarında istek gövdesi sınırı 4,5 MB'dır; bunun hemen altında kesiyoruz.
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 4.4 * 1024 * 1024,
    onError: (c) => c.json({ error: "İstek çok büyük (en fazla ~4 MB)." }, 413),
  }),
);

app.all("/api/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  }),
);

/* Vercel Cron: her gün birkaç yeni tür ekler. CRON_SECRET tanımlı değilse kapalıdır. */
app.get("/api/cron/species", async (c) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || c.req.header("authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Yetkisiz" }, 401);
  }
  const result = await runAutoBatch({
    limit: 8,
    minRecords: 20,
    requirePhoto: true,
    rotate: true,
    deadline: Date.now() + 40_000,
  });
  return c.json(result);
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
