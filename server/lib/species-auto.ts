/**
 * Otomatik tür + fotoğraf aktarma çekirdeği.
 * Kaynaklar: GBIF (tür, Türkçe ad, yayılış), iNaturalist (lisanslı fotoğraf), Vikipedi (açıklama).
 * Üç yerden kullanılır: Vercel cron (günlük), admin paneli düğmesi ve `npm run species:auto` komutu.
 */
import { speciesInputSchema, type SpeciesInput } from "../../db/species-schema.js";

const UA = "TurkiyeAgacAtlasi/1.0 (acik veri aktarimi)";

/** Taranacak ağaç / odunsu cinsler. Gerektiğinde genişletin. */
export const TREE_GENERA = [
  "Pinus", "Abies", "Picea", "Cedrus", "Juniperus", "Cupressus", "Taxus",
  "Quercus", "Fagus", "Castanea", "Carpinus", "Ostrya", "Corylus", "Betula", "Alnus",
  "Populus", "Salix", "Ulmus", "Zelkova", "Celtis", "Fraxinus", "Acer", "Tilia", "Platanus",
  "Juglans", "Pterocarya", "Prunus", "Malus", "Pyrus", "Sorbus", "Crataegus", "Cydonia", "Mespilus",
  "Cercis", "Ceratonia", "Olea", "Ficus", "Morus", "Pistacia", "Arbutus", "Laurus", "Myrtus",
  "Phillyrea", "Ilex", "Buxus", "Aesculus", "Cornus", "Liquidambar", "Styrax", "Tamarix",
  "Elaeagnus", "Ziziphus", "Robinia", "Gleditsia", "Albizia", "Eucalyptus", "Phoenix", "Rhus",
  "Cotinus", "Paliurus", "Punica", "Diospyros", "Vitex", "Nerium", "Platycladus", "Rhododendron",
];
const FRUIT_GENERA = new Set(["Malus", "Pyrus", "Cydonia", "Mespilus", "Prunus", "Ficus", "Morus", "Juglans",
  "Castanea", "Corylus", "Punica", "Diospyros", "Ziziphus", "Citrus", "Eriobotrya", "Olea"]);
const MAKI_GENERA = new Set(["Arbutus", "Laurus", "Myrtus", "Phillyrea", "Ceratonia", "Pistacia", "Erica",
  "Nerium", "Vitex", "Tamarix", "Rhododendron", "Paliurus", "Spartium", "Cistus", "Phoenix", "Buxus", "Ilex"]);

export interface AutoOptions {
  /** En fazla kaç yeni tür */
  limit: number;
  /** Türkiye'de en az kaç GBIF kaydı */
  minRecords?: number;
  genera?: string[];
  /** Latince tür adları (genera yerine) */
  names?: string[];
  requirePhoto?: boolean;
  allowNc?: boolean;
  /** DB'de var olan türleri de yeniden yaz */
  update?: boolean;
  /** Cins sırasını rastgele noktadan başlat (her çalıştırmada farklı türler gelsin) */
  rotate?: boolean;
  /** Bu zamandan (ms epoch) sonra yeni tür başlatma — sunucusuz süre sınırı için */
  deadline?: number;
  /** Zaten var olan kayıtlar (verilmezse DB'den okunur) */
  existing?: { ids: Set<string>; latins: Set<string>; keys: Set<number> };
  log?: (msg: string) => void;
}

/* ------------------------------ yardımcılar ------------------------------ */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T = any>(url: string, tries = 3): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(1200 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      await sleep(800 * (i + 1));
    }
  }
  return null;
}

/* iNaturalist: dakikada ~100 istek sınırı → istekler arası en az 700 ms */
let lastInat = 0;
async function inat<T = any>(path: string): Promise<T | null> {
  const wait = lastInat + 700 - Date.now();
  if (wait > 0) await sleep(wait);
  lastInat = Date.now();
  return fetchJson<T>(`https://api.inaturalist.org/v1${path}`);
}

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
export function slug(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
const titleTr = (s: string) =>
  s.split(" ").map((w) => (w ? w[0].toLocaleUpperCase("tr") + w.slice(1).toLocaleLowerCase("tr") : w)).join(" ");
export const binomials = (s: string) => (s.match(/[A-Z][a-z-]+ [a-z-]{3,}/g) ?? []).map((x) => x.toLowerCase());

/* ------------------------------ GBIF ------------------------------ */
const G = "https://api.gbif.org/v1";

async function genusKey(genus: string): Promise<number | null> {
  const m = await fetchJson<any>(`${G}/species/match?name=${encodeURIComponent(genus)}&rank=GENUS&kingdom=Plantae`);
  return m?.usageKey && m.rank === "GENUS" ? m.usageKey : null;
}

async function speciesInGenus(genus: string, minRecords: number): Promise<{ key: number; count: number }[]> {
  const gk = await genusKey(genus);
  if (!gk) return [];
  const r = await fetchJson<any>(
    `${G}/occurrence/search?country=TR&taxonKey=${gk}&limit=0&facet=speciesKey&facetLimit=500`,
  );
  const counts: { name: string; count: number }[] = r?.facets?.[0]?.counts ?? [];
  return counts
    .map((c) => ({ key: Number(c.name), count: c.count }))
    .filter((c) => c.count >= minRecords)
    .sort((a, b) => b.count - a.count);
}

async function matchLatin(name: string): Promise<{ key: number; count: number } | null> {
  const m = await fetchJson<any>(`${G}/species/match?name=${encodeURIComponent(name)}&kingdom=Plantae`);
  const key = m?.speciesKey ?? (m?.rank === "SPECIES" ? m?.usageKey : null);
  if (!key) return null;
  const r = await fetchJson<any>(`${G}/occurrence/search?country=TR&taxonKey=${key}&limit=0`);
  return { key, count: r?.count ?? 0 };
}

interface GbifInfo {
  key: number;
  latin: string;
  family: string;
  genus: string;
  className: string;
  trName?: string;
}
async function gbifBasic(key: number): Promise<Omit<GbifInfo, "trName"> | null> {
  const s = await fetchJson<any>(`${G}/species/${key}`);
  if (!s || s.taxonomicStatus === "SYNONYM" || !s.canonicalName) return null;
  return {
    key,
    latin: s.canonicalName,
    family: s.family ?? "",
    genus: s.genus ?? s.canonicalName.split(" ")[0],
    className: s.class ?? "",
  };
}
async function gbifTurkishName(key: number): Promise<string | undefined> {
  const v = await fetchJson<any>(`${G}/species/${key}/vernacularNames?limit=200`);
  return (v?.results ?? []).find((x: any) => x.language === "tur" && x.vernacularName)?.vernacularName;
}

/** Türkiye gözlemlerinden en yoğun birkaç bölgeyi (0.5° hücre) yayılış noktası yapar */
async function regionsFor(key: number): Promise<SpeciesInput["regions"]> {
  const r = await fetchJson<any>(
    `${G}/occurrence/search?country=TR&taxonKey=${key}&hasCoordinate=true&hasGeospatialIssue=false&limit=300`,
  );
  const cells = new Map<string, { lat: number; lng: number; n: number; states: Map<string, number> }>();
  for (const o of r?.results ?? []) {
    if (typeof o.decimalLatitude !== "number" || typeof o.decimalLongitude !== "number") continue;
    const k = `${Math.round(o.decimalLatitude * 2)}:${Math.round(o.decimalLongitude * 2)}`;
    const c = cells.get(k) ?? { lat: 0, lng: 0, n: 0, states: new Map() };
    c.lat += o.decimalLatitude;
    c.lng += o.decimalLongitude;
    c.n++;
    if (o.stateProvince) c.states.set(o.stateProvince, (c.states.get(o.stateProvince) ?? 0) + 1);
    cells.set(k, c);
  }
  return [...cells.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
    .map((c) => {
      const state = [...c.states.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        district: state ?? "Türkiye",
        note: `${c.n} gözlem kaydı (GBIF)`,
        coords: [Number((c.lat / c.n).toFixed(3)), Number((c.lng / c.n).toFixed(3))] as [number, number],
      };
    });
}

/* ------------------------------ iNaturalist ------------------------------ */
export interface Photo {
  url: string;
  credit: string;
  trName?: string;
  wikiTitle?: string;
}
export async function inatPhoto(latin: string, allowNc = false): Promise<Photo | null> {
  const licenses = new Set(["cc0", "cc-by", "cc-by-sa", ...(allowNc ? ["cc-by-nc", "cc-by-nc-sa"] : [])]);
  const s = await inat<any>(`/taxa?q=${encodeURIComponent(latin)}&rank=species&per_page=3&locale=tr`);
  const hit = (s?.results ?? []).find((t: any) => String(t.name).toLowerCase() === latin.toLowerCase());
  if (!hit) return null;
  const wikiTitle = hit.wikipedia_url ? decodeURIComponent(String(hit.wikipedia_url).split("/wiki/")[1] ?? "") : undefined;
  const trName =
    hit.preferred_common_name && hit.preferred_common_name.toLowerCase() !== latin.toLowerCase()
      ? hit.preferred_common_name
      : undefined;
  const mk = (p: any): Photo | null => {
    const url: string | undefined = p?.medium_url ?? p?.url?.replace("square", "medium");
    const lic = String(p?.license_code ?? "").toLowerCase();
    if (!url || !licenses.has(lic)) return null;
    return { url, credit: `${p.attribution ?? "iNaturalist"} (${lic.toUpperCase()}) · iNaturalist`, trName, wikiTitle };
  };
  const direct = mk(hit.default_photo);
  if (direct) return direct;
  const full = await inat<any>(`/taxa/${hit.id}`);
  for (const tp of full?.results?.[0]?.taxon_photos ?? []) {
    const p = mk(tp.photo);
    if (p) return p;
  }
  return trName || wikiTitle ? { url: "", credit: "", trName, wikiTitle } : null;
}

/* ------------------------------ Vikipedi ------------------------------ */
async function wikiSummary(titles: string[]): Promise<string | null> {
  for (const lang of ["tr", "en"]) {
    for (const t of titles.filter(Boolean)) {
      const r = await fetchJson<any>(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`,
      );
      const ex: string | undefined = r?.extract;
      if (r?.type === "standard" && ex && ex.length > 60) {
        return `${ex.trim()} (Kaynak: ${lang === "tr" ? "Türkçe" : "İngilizce"} Vikipedi, CC BY-SA)`;
      }
    }
  }
  return null;
}

function categoryOf(i: { className: string; genus: string }): SpeciesInput["category"] {
  if (i.className === "Pinopsida") return "ibreli";
  if (FRUIT_GENERA.has(i.genus)) return "meyve";
  if (MAKI_GENERA.has(i.genus)) return "maki";
  return "yaprakli";
}

/* ------------------------------ ana akış ------------------------------ */
export async function loadExisting() {
  const { getDb } = await import("../queries/connection.js");
  const { species } = await import("../../db/schema.js");
  const rows = await getDb()
    .select({ id: species.id, latin: species.latin, gbifKey: species.gbifKey, photoUrl: species.photoUrl })
    .from(species);
  return {
    ids: new Set(rows.map((r) => r.id)),
    latins: new Set(rows.flatMap((r) => binomials(r.latin))),
    keys: new Set(rows.map((r) => r.gbifKey).filter((k): k is number => k != null)),
    noPhoto: rows.filter((r) => !r.photoUrl).map((r) => ({ id: r.id, latin: r.latin })),
  };
}

/** Yeni türleri bulup hazırlar (DB'ye yazmaz). */
export async function buildSpeciesRows(opts: AutoOptions): Promise<SpeciesInput[]> {
  const log = opts.log ?? (() => {});
  const minRecords = opts.minRecords ?? 10;
  const existing = opts.existing ?? (await loadExisting());
  const timeLeft = () => !opts.deadline || Date.now() < opts.deadline;

  const rows: SpeciesInput[] = [];
  const usedIds = new Set(existing.ids);
  const seenKeys = new Set<number>();
  let order = 100000 + existing.ids.size;

  async function handle(c: { key: number; count: number }) {
    if (seenKeys.has(c.key)) return;
    seenKeys.add(c.key);
    if (!opts.update && existing.keys.has(c.key)) return;
    const g = await gbifBasic(c.key);
    if (!g) return;
    if (!opts.update && existing.latins.has(g.latin.toLowerCase())) return;

    const photo = await inatPhoto(g.latin, opts.allowNc);
    if (opts.requirePhoto && !photo?.url) {
      log(`  atlandı (lisanslı fotoğraf yok): ${g.latin}`);
      return;
    }
    const gbifTr = await gbifTurkishName(c.key);
    const trName = titleTr(gbifTr ?? photo?.trName ?? g.latin);
    const desc =
      (await wikiSummary([trName, photo?.wikiTitle ?? "", g.latin])) ??
      `${trName} (${g.latin}), ${g.family || "bitki"} familyasından bir odunsu bitki türüdür. Türkiye'de ${c.count} GBIF gözlem kaydı bulunmaktadır.`;
    const regions = await regionsFor(c.key);
    if (!regions.length) return;

    let id = slug(gbifTr ?? photo?.trName ?? g.latin) || slug(g.latin);
    if (usedIds.has(id)) id = slug(`${id}-${g.latin}`);
    usedIds.add(id);

    const parsed = speciesInputSchema.safeParse({
      id,
      name: trName,
      latin: g.latin,
      family: g.family,
      category: categoryOf(g),
      height: "",
      bloom: "",
      tag: null,
      description: desc,
      benefits: [],
      regions,
      academic: null,
      photoUrl: photo?.url || null,
      photoCredit: photo?.credit || null,
      gbifKey: c.key,
      source: "gbif",
      sortOrder: order++,
    });
    if (!parsed.success) {
      log(`  geçersiz kayıt (${g.latin}): ${parsed.error.issues[0]?.message}`);
      return;
    }
    rows.push(parsed.data);
    log(`[${rows.length}/${opts.limit}] ${trName} — ${g.latin} ${parsed.data.photoUrl ? "📷" : "(fotoğrafsız)"}`);
  }

  if (opts.names?.length) {
    for (const n of opts.names) {
      if (rows.length >= opts.limit || !timeLeft()) break;
      const m = await matchLatin(n);
      if (m) await handle(m);
      else log(`  eşleşmedi: ${n}`);
    }
  } else {
    const all = opts.genera?.length ? opts.genera : TREE_GENERA;
    const start = opts.rotate ? Math.floor(Math.random() * all.length) : 0;
    for (let i = 0; i < all.length && rows.length < opts.limit && timeLeft(); i++) {
      const genus = all[(start + i) % all.length];
      const list = await speciesInGenus(genus, minRecords);
      log(`${genus}: Türkiye'de ${list.length} tür (≥${minRecords} kayıt)`);
      for (const c of list) {
        if (rows.length >= opts.limit || !timeLeft()) break;
        await handle(c);
      }
    }
  }
  return rows;
}

/** Sunucu tarafı: yeni türleri bulur ve veritabanına yazar. Cron ve admin düğmesi bunu çağırır. */
export async function runAutoBatch(opts: AutoOptions) {
  const rows = await buildSpeciesRows(opts);
  if (rows.length) {
    const { upsertSpecies } = await import("../../db/lib-species.js");
    await upsertSpecies(rows);
    const { invalidateSpeciesCache } = await import("./species-store.js");
    invalidateSpeciesCache();
  }
  return { added: rows.length, names: rows.map((r) => r.name), withPhoto: rows.filter((r) => r.photoUrl).length };
}
