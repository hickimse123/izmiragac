import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { posts, comments, users, observations } from "../db/schema.js";

export const forumRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z
          .enum(["genel", "belirleme", "arastirma", "etkinlik"])
          .optional(),
        search: z.string().max(120).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input.category) conds.push(eq(posts.category, input.category));
      if (input.search) {
        const q = `%${input.search}%`;
        conds.push(or(like(posts.title, q), like(posts.content, q)));
      }
      const commentCount = sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.targetType} = 'post' AND ${comments.targetId} = ${posts.id})`;
      const rows = await db
        .select({
          post: posts,
          authorName: users.name,
          authorAvatar: users.avatar,
          commentCount,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(posts.createdAt))
        .limit(input.limit);
      return rows.map((r) => ({
        ...r.post,
        authorName: r.authorName,
        authorAvatar: r.authorAvatar,
        commentCount: Number(r.commentCount ?? 0),
      }));
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      await db
        .update(posts)
        .set({ views: sql`${posts.views} + 1` })
        .where(eq(posts.id, input.id));
      const [row] = await db
        .select({
          post: posts,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...row.post,
        authorName: row.authorName,
        authorAvatar: row.authorAvatar,
      };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(3).max(255),
        content: z.string().min(3).max(10000),
        category: z
          .enum(["genel", "belirleme", "arastirma", "etkinlik"])
          .default("genel"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [{ id }] = await getDb()
        .insert(posts)
        .values({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          category: input.category,
        })
        .$returningId();
      return { id };
    }),

  remove: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.posts.findFirst({
        where: eq(posts.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.userId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      await db
        .delete(comments)
        .where(and(eq(comments.targetType, "post"), eq(comments.targetId, row.id)));
      await db.delete(posts).where(eq(posts.id, row.id));
      return { ok: true };
    }),
});

export const commentsRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        targetType: z.enum(["post", "observation"]),
        targetId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({
          comment: comments,
          authorName: users.name,
          authorAvatar: users.avatar,
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(
          and(
            eq(comments.targetType, input.targetType),
            eq(comments.targetId, input.targetId),
          ),
        )
        .orderBy(comments.createdAt);
      return rows.map((r) => ({
        ...r.comment,
        authorName: r.authorName,
        authorAvatar: r.authorAvatar,
      }));
    }),

  add: authedQuery
    .input(
      z.object({
        targetType: z.enum(["post", "observation"]),
        targetId: z.number(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [{ id }] = await getDb()
        .insert(comments)
        .values({
          userId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          content: input.content,
        })
        .$returningId();
      return { id };
    }),

  remove: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.comments.findFirst({
        where: eq(comments.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.userId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      await db.delete(comments).where(eq(comments.id, row.id));
      return { ok: true };
    }),
});

/* Kullanıcıya gelen bildirimler: kendi içeriklerine yapılan son yorumlar */
export const notificationsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const myPosts = await db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(eq(posts.userId, ctx.user.id));
    const myObs = await db
      .select({ id: observations.id, name: observations.speciesId })
      .from(observations)
      .where(eq(observations.userId, ctx.user.id));

    const items: {
      id: number;
      targetType: "post" | "observation";
      targetId: number;
      targetLabel: string;
      content: string;
      authorName: string | null;
      createdAt: Date;
    }[] = [];

    for (const p of myPosts) {
      const cs = await db
        .select({ comment: comments, authorName: users.name })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(and(eq(comments.targetType, "post"), eq(comments.targetId, p.id)))
        .orderBy(desc(comments.createdAt))
        .limit(5);
      for (const c of cs)
        items.push({
          id: c.comment.id,
          targetType: "post",
          targetId: p.id,
          targetLabel: p.title,
          content: c.comment.content,
          authorName: c.authorName,
          createdAt: c.comment.createdAt,
        });
    }
    for (const o of myObs) {
      const cs = await db
        .select({ comment: comments, authorName: users.name })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(
          and(eq(comments.targetType, "observation"), eq(comments.targetId, o.id)),
        )
        .orderBy(desc(comments.createdAt))
        .limit(5);
      for (const c of cs)
        items.push({
          id: c.comment.id,
          targetType: "observation",
          targetId: o.id,
          targetLabel: o.name,
          content: c.comment.content,
          authorName: c.authorName,
          createdAt: c.comment.createdAt,
        });
    }
    return items
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);
  }),
});
