import { z } from "zod";

/** Tür kaydı doğrulama şeması (veritabanı bağlantısı gerektirmez). */
export const speciesInputSchema = z.object({
  id: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "id yalnızca a-z, 0-9 ve '-' içermeli"),
  name: z.string().min(1).max(255),
  latin: z.string().min(1).max(255),
  family: z.string().max(255).default(""),
  category: z.enum(["ibreli", "yaprakli", "maki", "meyve"]),
  height: z.string().max(64).default(""),
  bloom: z.string().max(128).default(""),
  tag: z.string().max(128).nullish(),
  description: z.string().min(1),
  benefits: z.array(z.string()).default([]),
  regions: z
    .array(
      z.object({
        district: z.string(),
        note: z.string().default(""),
        coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
      }),
    )
    .default([]),
  academic: z
    .object({
      iucn: z.string(),
      habitat: z.string(),
      altitude: z.string(),
      morphology: z.string(),
      distribution: z.string(),
      references: z.array(z.string()).default([]),
    })
    .nullish(),
  photoUrl: z.string().nullish(),
  photoCredit: z.string().max(255).nullish(),
  gbifKey: z.number().int().nullish(),
  source: z.string().max(32).default("import"),
  sortOrder: z.number().int().default(100000),
});
export type SpeciesInput = z.infer<typeof speciesInputSchema>;
