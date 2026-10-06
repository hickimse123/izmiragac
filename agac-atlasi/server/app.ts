import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";

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

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
