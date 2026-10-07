import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection.js";
import { species, type SpeciesRow } from "../../db/schema.js";
import type { Species } from "../../contracts/species.js";

/** Veritabanı satırı → istemcinin kullandığı Species biçimi */
function toSpecies(r: SpeciesRow, withAcademic: boolean): Species {
  return {
    id: r.id,
    name: r.name,
    latin: r.latin,
    family: r.family,
    category: r.category,
    height: r.height,
    bloom: r.bloom,
    tag: r.tag ?? undefined,
    desc: r.description,
    benefits: r.benefits ?? [],
    regions: r.regions ?? [],
    photoUrl: r.photoUrl ?? null,
    academic: withAcademic ? (r.academic ?? null) : undefined,
  };
}

/* Sunucusuz örnek başına kısa süreli önbellek: her istek veritabanına gitmesin */
const TTL_MS = 60_000;
let cache: { at: number; list: Species[] } | undefined;

/** Tüm türler (akademik veri hariç). Fotoğraflılar önce, sonra sortOrder, sonra ad. */
export async function getAllSpecies(): Promise<Species[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  const rows = await getDb()
    .select()
    .from(species)
    .orderBy(
      sql`(${species.photoUrl} IS NULL OR ${species.photoUrl} = '')`,
      asc(species.sortOrder),
      asc(species.name),
    );
  const list = rows.map((r) => toSpecies(r, false));
  cache = { at: Date.now(), list };
  return list;
}

export async function getSpeciesByIdDb(id: string): Promise<Species | undefined> {
  const [row] = await getDb().select().from(species).where(eq(species.id, id)).limit(1);
  return row ? toSpecies(row, true) : undefined;
}

export function invalidateSpeciesCache() {
  cache = undefined;
}
