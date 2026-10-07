/**
 * Tür kataloğunu veritabanına yazan ortak yardımcılar.
 * Hem seed betiği hem de toplu içe aktarma betiği (ileride otomatik tür+fotoğraf
 * çeken script de) bunu kullanır.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/queries/connection.js";
import { species } from "./schema.js";

export { speciesInputSchema, type SpeciesInput } from "./species-schema.js";
import type { SpeciesInput } from "./species-schema.js";

/** Türleri 100'lük gruplar halinde ekler; id zaten varsa günceller. */
export async function upsertSpecies(rows: SpeciesInput[]) {
  const db = getDb();
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({
      ...r,
      tag: r.tag ?? null,
      academic: r.academic ?? null,
      photoUrl: r.photoUrl ?? null,
      photoCredit: r.photoCredit ?? null,
      gbifKey: r.gbifKey ?? null,
    }));
    await db
      .insert(species)
      .values(chunk)
      .onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          latin: sql`VALUES(latin)`,
          family: sql`VALUES(family)`,
          category: sql`VALUES(category)`,
          height: sql`VALUES(height)`,
          bloom: sql`VALUES(bloom)`,
          tag: sql`VALUES(tag)`,
          description: sql`VALUES(description)`,
          benefits: sql`VALUES(benefits)`,
          regions: sql`VALUES(regions)`,
          // Dolu olan akademik veri / fotoğraf, yeni kayıt boşsa ezilmesin
          academic: sql`COALESCE(VALUES(academic), academic)`,
          photoUrl: sql`COALESCE(VALUES(photoUrl), photoUrl)`,
          photoCredit: sql`COALESCE(VALUES(photoCredit), photoCredit)`,
          gbifKey: sql`COALESCE(VALUES(gbifKey), gbifKey)`,
          source: sql`VALUES(source)`,
          sortOrder: sql`VALUES(sortOrder)`,
        },
      });
    console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
}
