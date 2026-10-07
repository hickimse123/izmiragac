import { desc, eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { observations, posts, comments, users } from "../db/schema.js";
import { ALL_SPECIES, getSpeciesById } from "../contracts/species.js";
import { storage } from "./lib/storage.js";

export const statsRouter = createRouter({
  overview: publicQuery.query(async () => {
    const db = getDb();
    const [obsCount] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(observations);
    const [postCount] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(posts);
    const [commentCount] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(comments);
    const [userCount] = await db.select({ c: sql<number>`COUNT(*)` }).from(users);

    const bySpecies = await db
      .select({ speciesId: observations.speciesId, c: sql<number>`COUNT(*)` })
      .from(observations)
      .groupBy(observations.speciesId);

    const byDistrict = await db
      .select({ district: observations.district, c: sql<number>`COUNT(*)` })
      .from(observations)
      .groupBy(observations.district);

    const obsDates = await db
      .select({ createdAt: observations.createdAt })
      .from(observations);
    const monthMap = new Map<string, number>();
    for (const r of obsDates) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
    const byMonth = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    const topContributors = await db
      .select({
        userId: observations.userId,
        name: users.name,
        avatar: users.avatar,
        c: sql<number>`COUNT(*)`,
      })
      .from(observations)
      .leftJoin(users, eq(observations.userId, users.id))
      .groupBy(observations.userId, users.name, users.avatar)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(8);

    return {
      totals: {
        observations: Number(obsCount?.c ?? 0),
        posts: Number(postCount?.c ?? 0),
        comments: Number(commentCount?.c ?? 0),
        users: Number(userCount?.c ?? 0),
        speciesCatalogue: ALL_SPECIES.length,
      },
      bySpecies: bySpecies.map((r) => ({
        speciesId: r.speciesId,
        name: getSpeciesById(r.speciesId)?.name ?? r.speciesId,
        count: Number(r.c),
      })),
      byDistrict: byDistrict
        .filter((r) => r.district)
        .map((r) => ({ district: r.district as string, count: Number(r.c) })),
      byMonth,
      topContributors: await Promise.all(
        topContributors.map(async (r) => ({
          userId: r.userId,
          name: r.name ?? "Anonim",
          avatar: storage.resolveUrl(r.avatar),
          count: Number(r.c),
        })),
      ),
    };
  }),

  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [myObs] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(observations)
      .where(eq(observations.userId, ctx.user.id));
    const [myPosts] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(posts)
      .where(eq(posts.userId, ctx.user.id));
    const [myComments] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(comments)
      .where(eq(comments.userId, ctx.user.id));
    const [likesReceived] = await db
      .select({ s: sql<number>`COALESCE(SUM(${observations.likes}),0)` })
      .from(observations)
      .where(eq(observations.userId, ctx.user.id));
    return {
      observations: Number(myObs?.c ?? 0),
      posts: Number(myPosts?.c ?? 0),
      comments: Number(myComments?.c ?? 0),
      likesReceived: Number(likesReceived?.s ?? 0),
    };
  }),
});
