/**
 * JSON dosyasından toplu tür içe aktarma:
 *   npm run species:import -- data/yeni-turler.json
 *
 * Dosya, speciesInputSchema'ya uyan nesnelerden oluşan bir dizi olmalı
 * (bkz. db/lib-species.ts). Fotoğraf için "photoUrl" alanına tam URL
 * (https://…) ya da /species/<id>.jpg yazılır.
 * İleride otomatik tür + fotoğraf çeken script, aynı şekilde
 * `upsertSpecies()` fonksiyonunu çağırabilir.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { speciesInputSchema, upsertSpecies } from "./lib-species.js";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Kullanım: npm run species:import -- <dosya.json>");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const parsed = z.array(speciesInputSchema).safeParse(raw);
  if (!parsed.success) {
    console.error("Doğrulama hatası:");
    console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
    process.exit(1);
  }
  console.log(`${parsed.data.length} tür içe aktarılıyor…`);
  await upsertSpecies(parsed.data);
  console.log("Tamamlandı.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
