import * as cookie from "cookie";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { Session } from "../contracts/constants.js";
import { getSessionCookieOptions } from "./lib/cookies.js";
import { createRouter, authedQuery, publicQuery } from "./middleware.js";
import { signSessionToken } from "./lib/session.js";
import { env } from "./lib/env.js";
import { getDb } from "./queries/connection.js";
import { findUserByUnionId } from "./queries/users.js";
import { users } from "../db/schema.js";
import { storage } from "./lib/storage.js";

const scryptAsync = promisify(scrypt);
// Vercel gövde sınırı (4,5 MB) nedeniyle 3 MB; istemci zaten JPEG'e küçültüyor.
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

const emailToUnionId = (email: string) => `email:${email.trim().toLowerCase()}`;

async function issueSessionCookie(
  headers: Headers,
  resHeaders: Headers,
  unionId: string,
) {
  const token = await signSessionToken({ unionId });
  const opts = getSessionCookieOptions(headers);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

/** avatar/banner alanında Blob URL'si saklanır; eski (http olmayan) değerler yok sayılır */
const resolveMediaUrl = (value: string | null) => storage.resolveUrl(value);

async function toPublicUser(u: typeof users.$inferSelect) {
  const { passwordHash, ...rest } = u;
  void passwordHash; // asla istemciye gönderme
  return {
    ...rest,
    avatarUrl: resolveMediaUrl(u.avatar),
    bannerUrl: resolveMediaUrl(u.banner),
  };
}

export const authRouter = createRouter({
  me: authedQuery.query(async (opts) => toPublicUser(opts.ctx.user)),

  register: publicQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email().max(320),
        password: z.string().min(6).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unionId = emailToUnionId(input.email);
      const existing = await findUserByUnionId(unionId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Bu e-posta adresiyle zaten bir hesap var.",
        });
      }
      const passwordHash = await hashPassword(input.password);
      const db = getDb();
      await db.insert(users).values({
        unionId,
        name: input.name,
        email: input.email.trim().toLowerCase(),
        passwordHash,
        lastSignInAt: new Date(),
        ...(env.adminEmail && input.email.trim().toLowerCase() === env.adminEmail
          ? { role: "admin" as const }
          : {}),
      });
      await issueSessionCookie(ctx.req.headers, ctx.resHeaders, unionId);
      const created = await findUserByUnionId(unionId);
      return { user: created ? await toPublicUser(created) : null };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unionId = emailToUnionId(input.email);
      const user = await findUserByUnionId(unionId);
      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-posta veya şifre hatalı.",
        });
      }
      const ok = await verifyPassword(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-posta veya şifre hatalı.",
        });
      }
      await getDb()
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, user.id));
      await issueSessionCookie(ctx.req.headers, ctx.resHeaders, unionId);
      return { user: await toPublicUser(user) };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(60).optional(),
        bio: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Partial<typeof users.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.bio !== undefined) patch.bio = input.bio;
      if (Object.keys(patch).length === 0) return { user: await toPublicUser(ctx.user) };
      await getDb().update(users).set(patch).where(eq(users.id, ctx.user.id));
      const fresh = await getDb().query.users.findFirst({ where: eq(users.id, ctx.user.id) });
      return { user: fresh ? await toPublicUser(fresh) : null };
    }),

  updateAvatar: authedQuery
    .input(
      z.object({
        contentBase64: z.string().max(Math.ceil((MAX_AVATAR_BYTES * 4) / 3)),
        contentType: z.string().regex(/^image\//),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
      if (bytes.length > MAX_AVATAR_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Görsel çok büyük (en fazla 3 MB)." });
      }
      const saved = await storage.uploadFile({
        fileContent: bytes,
        fileName: `profiles/u${ctx.user.id}/avatar.jpg`,
        contentType: input.contentType,
      });
      await getDb().update(users).set({ avatar: saved.key }).where(eq(users.id, ctx.user.id));
      await storage.deleteFile(ctx.user.avatar); // eski dosyayı temizle
      return { avatarUrl: resolveMediaUrl(saved.key) };
    }),

  updateBanner: authedQuery
    .input(
      z.object({
        contentBase64: z.string().max(Math.ceil((MAX_AVATAR_BYTES * 4) / 3)),
        contentType: z.string().regex(/^image\//),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
      if (bytes.length > MAX_AVATAR_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Görsel çok büyük (en fazla 3 MB)." });
      }
      const saved = await storage.uploadFile({
        fileContent: bytes,
        fileName: `profiles/u${ctx.user.id}/banner.jpg`,
        contentType: input.contentType,
      });
      await getDb().update(users).set({ banner: saved.key }).where(eq(users.id, ctx.user.id));
      await storage.deleteFile(ctx.user.banner); // eski dosyayı temizle
      return { bannerUrl: resolveMediaUrl(saved.key) };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
