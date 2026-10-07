import { authRouter } from "./auth-router.js";
import { createRouter, publicQuery } from "./middleware.js";
import { observationsRouter } from "./observations-router.js";
import { forumRouter, commentsRouter, notificationsRouter } from "./forum-router.js";
import { statsRouter } from "./stats-router.js";
import { identifyRouter } from "./identify-router.js";
import { speciesRouter } from "./species-router.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  observations: observationsRouter,
  forum: forumRouter,
  comments: commentsRouter,
  notifications: notificationsRouter,
  stats: statsRouter,
  identify: identifyRouter,
  species: speciesRouter,
});

export type AppRouter = typeof appRouter;
