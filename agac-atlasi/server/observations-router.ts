import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { observations, observationLikes, users, comments } from "../db/schema.js";
import { storage } from "./lib/storage.js";

// Vercel fonksiyon gövdesi sınırı 4,5 MB (base64 ile ~%33 şişer) → fotoğraf en fazla 3 MB.
// İstemci fotoğrafı yüklemeden önce küçültür (Contribute.tsx).
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const safeFileName = (name: string) =>
  name.replace(/[^\w.-]+/g, "_").replace(/^\.+/, "").slice(0, 80) || "foto.jpg";

export const observationsRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        speciesId: z.string().optional(),
        district: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input.speciesId) conds.push(eq(observations.speciesId, input.speciesId));
      if (input.district)
        conds.push(eq(observations.district, input.district));
      const rows = await db
        .select({
          observation: observations,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(observations)
        .leftJoin(users, eq(observations.userId, users.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(observations.createdAt))
        .limit(input.limit);
      return rows.map((r) => ({ ...r.observation, authorName: r.authorName, authorAvatar: r.authorAvatar }));
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select({
          observation: observations,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(observations)
        .leftJoin(users, eq(observations.userId, users.id))
        .where(eq(observations.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...row.observation, authorName: row.authorName, authorAvatar: row.authorAvatar };
    }),

  create: authedQuery
    .input(
      z.object({
        speciesId: z.string().min(1).max(64),
        customName: z.string().max(255).optional(),
        lat: z.number().min(35.5).max(42.5),
        lng: z.number().min(25.5).max(45.0),
        district: z.string().max(120).optional(),
        note: z.string().max(2000).optional(),
        photo: z
          .object({
            name: z.string().max(255),
            contentBase64: z.string().max(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 16),
            contentType: z.string().max(100).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let photoKey: string | null = null;
      if (input.photo) {
        const bytes = Uint8Array.from(
          Buffer.from(input.photo.contentBase64, "base64"),
        );
        if (bytes.length > MAX_PHOTO_BYTES)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Fotoğraf 3 MB sınırını aşıyor.",
          });
        const contentType = input.photo.contentType ?? "image/jpeg";
        if (!contentType.startsWith("image/"))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Yalnızca görsel dosyaları yüklenebilir." });
        const saved = await storage.uploadFile({
          fileContent: bytes,
          fileName: `observations/u${ctx.user.id}/${safeFileName(input.photo.name)}`,
          contentType,
        });
        photoKey = saved.key;
      }
      const db = getDb();
      const [{ id }] = await db
        .insert(observations)
        .values({
          userId: ctx.user.id,
          speciesId: input.speciesId,
          customName: input.customName ?? null,
          lat: input.lat,
          lng: input.lng,
          district: input.district ?? null,
          note: input.note ?? null,
          photoKey,
        })
        .$returningId();
      return { id };
    }),

  toggleLike: authedQuery
    .input(z.object({ observationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.observationLikes.findFirst({
        where: and(
          eq(observationLikes.userId, ctx.user.id),
          eq(observationLikes.observationId, input.observationId),
        ),
      });
      if (existing) {
        await db
          .delete(observationLikes)
          .where(eq(observationLikes.id, existing.id));
        await db
          .update(observations)
          .set({ likes: sql`GREATEST(${observations.likes} - 1, 0)` })
          .where(eq(observations.id, input.observationId));
        return { liked: false };
      }
      await db
        .insert(observationLikes)
        .values({ userId: ctx.user.id, observationId: input.observationId });
      await db
        .update(observations)
        .set({ likes: sql`${observations.likes} + 1` })
        .where(eq(observations.id, input.observationId));
      return { liked: true };
    }),

  myLikes: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb()
      .select({ observationId: observationLikes.observationId })
      .from(observationLikes)
      .where(eq(observationLikes.userId, ctx.user.id));
    return rows.map((r) => r.observationId);
  }),

  remove: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.observations.findFirst({
        where: eq(observations.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.userId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      await storage.deleteFile(row.photoKey);
      await db.delete(observationLikes).where(eq(observationLikes.observationId, row.id));
      await db
        .delete(comments)
        .where(
          and(eq(comments.targetType, "observation"), eq(comments.targetId, row.id)),
        );
      await db.delete(observations).where(eq(observations.id, row.id));
      return { ok: true };
    }),

  /* Fotoğraf render: kısa ömürlü imzalı URL */
  photoUrl: publicQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => ({
      // Vercel Blob URL'leri kalıcıdır; saklanan değer zaten gösterilebilir URL'dir.
      url: storage.resolveUrl(input.key) ?? "",
    })),

  photoUrls: publicQuery
    .input(z.object({ keys: z.array(z.string()).max(60) }))
    .query(({ input }) => {
      const urls: Record<string, string> = {};
      for (const k of input.keys) {
        const u = storage.resolveUrl(k);
        if (u) urls[k] = u;
      }
      return { urls };
    }),
});
