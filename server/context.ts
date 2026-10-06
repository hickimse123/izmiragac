import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../db/schema.js";
import { authenticateRequest } from "./lib/auth.js";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = (await authenticateRequest(opts.req.headers)) ?? undefined;
  } catch (err) {
    // Oturum doğrulama hatası (örn. DB erişimi) → anonim kabul et, logla
    console.warn("[auth] oturum doğrulanamadı:", err);
  }
  return ctx;
}
