/**
 * Mevcut yerleşik tür verisini (db/seed-data) veritabanına yükler.
 *   npm run db:seed:species
 * Tekrar çalıştırmak güvenlidir (var olanı günceller, fotoğrafı korur).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SPECIES, EXTRA_SPECIES, TURKIYE_SPECIES, ACADEMIC } from "./seed-data/legacy.js";
import { MORE_SPECIES } from "./seed-data/more.js";
import { MORE_ACADEMIC } from "./seed-data/academic-more.js";
import { upsertSpecies, speciesInputSchema, type SpeciesInput } from "./lib-species.js";

const academic = { ...ACADEMIC, ...MORE_ACADEMIC };
const all = [...SPECIES, ...EXTRA_SPECIES, ...TURKIYE_SPECIES, ...MORE_SPECIES];

const rows: SpeciesInput[] = all.map((s, i) => {
  const file = resolve(process.cwd(), "public/species", `${s.id}.jpg`);
  return speciesInputSchema.parse({
    id: s.id,
    name: s.name,
    latin: s.latin,
    family: s.family,
    category: s.category,
    height: s.height,
    bloom: s.bloom,
    tag: s.tag ?? null,
    description: s.desc,
    benefits: s.benefits,
    regions: s.regions,
    academic: academic[s.id] ?? null,
    photoUrl: existsSync(file) ? `/species/${s.id}.jpg` : null,
    source: "seed",
    sortOrder: i,
  });
});

async function main() {
  console.log(`${rows.length} tür yükleniyor…`);
  await upsertSpecies(rows);
  console.log("Tamamlandı.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
