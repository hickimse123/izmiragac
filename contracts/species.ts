export type Category = 'ibreli' | 'yaprakli' | 'maki' | 'meyve';

export interface Region {
  district: string;
  note: string;
  coords: [number, number]; // [lat, lng]
}

export interface Species {
  photoUrl?: string | null; // /species/<id>.jpg veya harici URL
  academic?: Academic | null; // yalnızca tek tür sorgusunda dolu gelir
  id: string;
  name: string;
  latin: string;
  family: string;
  category: Category;
  height: string;
  bloom: string;
  desc: string;
  benefits: string[];
  regions: Region[];
  tag?: string; // örn. "Relikt", "Coğrafi İşaretli", "Anıt Ağaç"
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; soft: string }
> = {
  ibreli: { label: 'İbreli', color: '#2F5233', soft: '#e3ecdf' },
  yaprakli: { label: 'Yaprak Döken', color: '#57772e', soft: '#edf3dd' },
  maki: { label: 'Maki', color: '#96742a', soft: '#f5eedd' },
  meyve: { label: 'Meyve & Ekonomik', color: '#b0762a', soft: '#f8efdd' },
};

export const TURKEY_CENTER: [number, number] = [39.0, 35.2];

export interface District {
  name: string;
  coords: [number, number];
}

export const HOTSPOTS: District[] = [
  { name: 'Kazdağları', coords: [39.7, 26.85] },
  { name: 'Uludağ', coords: [40.07, 29.13] },
  { name: 'Kaçkar Dağları', coords: [40.84, 41.15] },
  { name: 'Köyceğiz Sığla Ormanı', coords: [36.97, 28.68] },
  { name: 'Datça Yarımadası', coords: [36.75, 27.68] },
  { name: 'Yedigöller', coords: [40.9, 31.75] },
  { name: 'Istranca Ormanları', coords: [41.75, 27.8] },
  { name: 'Köprülü Kanyon', coords: [37.2, 31.2] },
  { name: 'Sarıkamış', coords: [40.33, 42.58] },
  { name: 'Bozdağ (İzmir)', coords: [38.36, 28.09] },
  { name: 'Kozak Yaylası', coords: [39.2, 27.1] },
  { name: 'Gediz Deltası', coords: [38.6, 26.9] },
];


export interface Academic {
  iucn: string;
  habitat: string;
  altitude: string;
  morphology: string;
  distribution: string;
  references: string[];
}

export interface Place {
  name: string;
  coords: [number, number];
  kind: 'district' | 'hotspot';
}

/* İlçe/il listesi (filtreleme için) — tür listesinden türetilir */
export function deriveDistricts(species: Species[]): string[] {
  return Array.from(
    new Set(species.flatMap((s) => s.regions.map((r) => r.district.split(' / ')[0].trim()))),
  ).sort((a, b) => a.localeCompare(b, 'tr'));
}

/* Harita araması için gezilebilir yer dizini (ilçe/il merkezleri + sıcak noktalar) */
export function derivePlaces(species: Species[]): Place[] {
  const seen = new Map<string, [number, number]>();
  for (const s of species)
    for (const r of s.regions) {
      const key = r.district.split(' / ')[0].trim();
      if (!seen.has(key)) seen.set(key, r.coords);
    }
  const places: Place[] = Array.from(seen, ([name, coords]) => ({ name, coords, kind: 'district' as const }));
  for (const h of HOTSPOTS) places.push({ name: h.name, coords: h.coords, kind: 'hotspot' });
  return places;
}
