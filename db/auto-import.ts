/**
 * Bilgisayardan toplu aktarma (isteğe bağlı; normalde Vercel cron + admin düğmesi yeterlidir).
 *   npm run species:auto -- --genus Quercus,Acer --limit 10 --dry-run
 *   npm run species:auto -- --discover --min-records 30 --limit 200 --require-photo
 *   npm run species:auto -- --names data/latince-liste.txt
 *   npm run species:auto -- --fill-photos
 *   npm run species:auto -- --genus Pinus --out data/pinus.json
 * Bayraklar: --limit N  --min-records N  --require-photo  --allow-nc  --download  --update
 *            --dry-run  --out dosya.json  --fill-photos
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSpeciesRows, inatPhoto, loadExisting, binomials } from "../server/lib/species-auto.js";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const DRY = flag("dry-run");
const OUT = opt("out");
const DOWNLOAD = flag("download");
const ALLOW_NC = flag("allow-nc");

async function savePhoto(id: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const dir = resolve(process.cwd(), "public/species");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${id}.jpg`), Buffer.from(await res.arrayBuffer()));
    return `/species/${id}.jpg`;
  } catch {
    return null;
  }
}

async function fillPhotos() {
  const { getDb } = await import("../server/queries/connection.js");
  const { species } = await import("./schema.js");
  const { eq } = await import("drizzle-orm");
  const { noPhoto } = await loadExisting();
  let ok = 0;
  for (const [n, s] of noPhoto.entries()) {
    const bn = binomials(s.latin)[0];
    if (!bn) continue;
    const p = await inatPhoto(bn.charAt(0).toUpperCase() + bn.slice(1), ALLOW_NC);
    if (p?.url) {
      const url = DOWNLOAD ? ((await savePhoto(s.id, p.url)) ?? p.url) : p.url;
      if (!DRY) await getDb().update(species).set({ photoUrl: url, photoCredit: p.credit }).where(eq(species.id, s.id));
      ok++;
      console.log(`[${n + 1}/${noPhoto.length}] ${s.id}: fotoğraf bulundu`);
    } else console.log(`[${n + 1}/${noPhoto.length}] ${s.id}: lisanslı fotoğraf yok`);
  }
  console.log(`\n${ok}/${noPhoto.length} tür için fotoğraf eklendi.`);
}

async function main() {
  if (flag("fill-photos")) return fillPhotos();

  const namesFile = opt("names");
  const rows = await buildSpeciesRows({
    limit: Number(opt("limit") ?? 50),
    minRecords: Number(opt("min-records") ?? 10),
    genera: opt("genus")?.split(",").map((g) => g.trim()).filter(Boolean),
    names: namesFile
      ? readFileSync(namesFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
      : undefined,
    requirePhoto: flag("require-photo"),
    allowNc: ALLOW_NC,
    update: flag("update"),
    existing: DRY && !flag("update") ? { ids: new Set(), latins: new Set(), keys: new Set() } : undefined,
    log: console.log,
  });

  if (DOWNLOAD && !DRY) {
    for (const r of rows) if (r.photoUrl) r.photoUrl = (await savePhoto(r.id, r.photoUrl)) ?? r.photoUrl;
  }
  console.log(`\n${rows.length} yeni tür hazır (${rows.filter((r) => r.photoUrl).length} fotoğraflı).`);
  if (OUT) {
    writeFileSync(OUT, JSON.stringify(rows, null, 2));
    console.log(`JSON yazıldı: ${OUT}  →  npm run species:import -- ${OUT}`);
  } else if (!DRY && rows.length) {
    const { upsertSpecies } = await import("./lib-species.js");
    await upsertSpecies(rows);
    console.log("Veritabanına yazıldı.");
  } else if (DRY) console.log("(dry-run: hiçbir şey yazılmadı)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
