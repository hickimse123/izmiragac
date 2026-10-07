import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminQuery } from "./middleware.js";
import { runAutoBatch } from "./lib/species-auto.js";
import { getAllSpecies, getSpeciesByIdDb } from "./lib/species-store.js";

export const speciesRouter = createRouter({
  /** Tüm tür kataloğu (harita, kütüphane, istatistik için). Akademik veri içermez. */
  list: publicQuery.query(() => getAllSpecies()),

  /** Tek tür + akademik veriler */
  byId: publicQuery.input(z.object({ id: z.string().min(1).max(64) })).query(async ({ input }) => {
    const s = await getSpeciesByIdDb(input.id);
    if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Tür bulunamadı." });
    return s;
  }),

  /** Admin: GBIF + iNaturalist + Vikipedi'den birkaç yeni tür (fotoğraflı) ekler. Birkaç kez tıklanabilir. */
  autoImport: adminQuery.mutation(() =>
    runAutoBatch({
      limit: 8,
      minRecords: 20,
      requirePhoto: true,
      rotate: true,
      deadline: Date.now() + 40_000, // Vercel fonksiyon süresi 60 sn
    }),
  ),
});
