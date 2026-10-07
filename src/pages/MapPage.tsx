import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, Layers, X, Crosshair, ChevronDown, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AtlasMap from "@/components/map/AtlasMap";
import { CATEGORY_META, type Category } from "@contracts/species";
import { useSpecies } from "@/providers/species";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function MapPage() {
  const { t } = useLang();
  const { species: ALL_SPECIES, places: PLACES } = useSpecies();
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [speciesId, setSpeciesId] = useState<string | null>(params.get("tur"));
  const [category, setCategory] = useState<Category | null>(null);
  const [showCatalogue, setShowCatalogue] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const initialTarget = useMemo(() => {
    const lat = params.get("lat");
    const lng = params.get("lng");
    if (lat && lng) return { center: [parseFloat(lat), parseFloat(lng)] as [number, number], zoom: 12 };
    return null;
  }, [params]);
  const [flyTarget, setFlyTarget] = useState(initialTarget);
  const [locating, setLocating] = useState(false);

  const filteredSpecies = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return ALL_SPECIES;
    return ALL_SPECIES.filter(
      (sp) =>
        sp.name.toLocaleLowerCase("tr").includes(s) ||
        sp.latin.toLocaleLowerCase("tr").includes(s),
    );
  }, [ALL_SPECIES, q]);

  /* İlçe / sıcak nokta sonuçları — normal harita uygulamaları gibi */
  const matchedPlaces = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return [];
    return PLACES.filter((p) => p.name.toLocaleLowerCase("tr").includes(s)).slice(0, 5);
  }, [PLACES, q]);

  const selected = speciesId ? ALL_SPECIES.find((s) => s.id === speciesId) : null;

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tarayıcınız konum servisini desteklemiyor.");
      return;
    }
    if (locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setFlyTarget({ center: [pos.coords.latitude, pos.coords.longitude], zoom: 14 });
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Konum izni reddedildi. Tarayıcı ayarlarından bu site için konum iznini açın.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error("Konumunuz şu an alınamıyor. GPS'in açık olduğundan emin olun.");
        } else {
          toast.error("Konum alınamadı, lütfen tekrar deneyin.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  return (
    <div className="relative h-[100dvh] w-full pt-16">
      <AtlasMap
        showCatalogue={showCatalogue}
        showCommunity={showCommunity}
        speciesFilter={speciesId}
        categoryFilter={category}
        flyTarget={flyTarget}
      />

      {/* Arama çubuğu */}
      <div className="absolute left-3 right-3 top-20 z-[900] sm:left-5 sm:right-auto sm:w-96">
        <div className="glass flex items-center gap-2 rounded-2xl border border-border/60 px-4 shadow-xl">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSheetOpen(true);
            }}
            onFocus={() => setSheetOpen(true)}
            placeholder={t("common.searchSpecies")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {(q || selected) && (
            <button
              onClick={() => {
                setQ("");
                setSpeciesId(null);
                setSheetOpen(false);
              }}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Arama sonuçları / tür listesi */}
        {sheetOpen && (
          <div className="glass scrollbar-thin mt-2 max-h-[46vh] overflow-y-auto rounded-2xl border border-border/60 shadow-xl">
            {matchedPlaces.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Yerler
                </p>
                {matchedPlaces.map((p) => (
                  <button
                    key={`place-${p.name}`}
                    onClick={() => {
                      setFlyTarget({ center: p.coords, zoom: 13 });
                      setSheetOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/80"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 text-sm font-semibold">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.kind === "hotspot" ? "Sıcak nokta" : "Bölge"}
                    </span>
                  </button>
                ))}
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Türler
                </p>
              </>
            )}
            {filteredSpecies.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSpeciesId(s.id === speciesId ? null : s.id);
                  setFlyTarget({ center: s.regions[0].coords, zoom: 11 });
                  setSheetOpen(false);
                  setQ("");
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/80",
                  speciesId === s.id && "bg-primary/10",
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[s.category].color }}
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className="block text-xs italic text-muted-foreground">{s.latin}</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {s.regions.length} nokta
                </span>
              </button>
            ))}
            {filteredSpecies.length === 0 && matchedPlaces.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sonuç bulunamadı</p>
            )}
          </div>
        )}
      </div>

      {/* Kategori filtre çipleri */}
      <div className="no-scrollbar absolute left-3 right-3 top-[8.5rem] z-[900] flex gap-2 overflow-x-auto sm:left-5 sm:right-auto sm:max-w-[calc(100%-40px)]">
        <button
          onClick={() => setCategory(null)}
          className={cn(
            "glass h-9 shrink-0 rounded-full border px-4 text-xs font-semibold shadow transition-all",
            !category ? "border-primary bg-primary text-primary-foreground" : "border-border/60",
          )}
        >
          {t("common.all")}
        </button>
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? null : c)}
            className={cn(
              "glass flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow transition-all",
              category === c ? "border-primary bg-primary text-primary-foreground" : "border-border/60",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} />
            {t(`cat.${c}` as const)}
          </button>
        ))}
      </div>

      {/* Sağ kontroller */}
      <div className="absolute bottom-24 right-3 z-[900] flex flex-col gap-2 sm:bottom-8 sm:right-5">
        <button
          onClick={locate}
          disabled={locating}
          aria-label={t("map.locate")}
          className="glass flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
        >
          {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
        </button>
        <div className="relative">
          <button
            onClick={() => setLayersOpen((v) => !v)}
            aria-label={t("map.layers")}
            className={cn(
              "glass flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 shadow-lg transition-transform hover:scale-105 active:scale-95",
              layersOpen && "bg-primary text-primary-foreground",
            )}
          >
            <Layers className="h-5 w-5" />
          </button>
          {layersOpen && (
            <div className="glass absolute bottom-0 right-14 w-56 animate-fade-in rounded-2xl border border-border/60 p-2 shadow-xl">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("map.layers")}
              </p>
              {[
                { label: t("map.catalogue"), value: showCatalogue, set: setShowCatalogue },
                { label: t("map.community"), value: showCommunity, set: setShowCommunity },
              ].map((l) => (
                <button
                  key={l.label}
                  onClick={() => l.set(!l.value)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  {l.label}
                  <span
                    className={cn(
                      "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                      l.value ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-600",
                    )}
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full bg-white shadow transition-transform",
                        l.value && "translate-x-4",
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Seçili tür bilgi kartı — mobilde sağ kontrol sütunuyla çakışmaması için sağda boşluk bırakır */}
      {selected && (
        <div className="glass animate-fade-up absolute bottom-24 left-3 right-[4.5rem] z-[880] rounded-2xl border border-border/60 p-4 shadow-xl sm:bottom-8 sm:left-5 sm:right-auto sm:w-96">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif-d text-lg font-bold">{selected.name}</h3>
              <p className="text-xs italic text-muted-foreground">{selected.latin}</p>
            </div>
            <button onClick={() => setSpeciesId(null)} className="rounded-full p-1.5 hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
            {selected.desc}
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href={`/tur/${selected.id}`}
              className="flex-1 rounded-xl bg-primary py-2 text-center text-xs font-bold text-primary-foreground"
            >
              {t("common.details")}
            </a>
            <span className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
              {selected.regions.length} {t("common.regions").toLocaleLowerCase("tr")}
            </span>
          </div>
        </div>
      )}

      {/* Mobil: liste aç/kapa */}
      <button
        onClick={() => setSheetOpen((v) => !v)}
        className="glass absolute left-1/2 top-[11.5rem] z-[890] flex h-7 -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 px-3 text-[10px] font-semibold text-muted-foreground shadow sm:hidden"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", sheetOpen && "rotate-180")} />
        Türler
      </button>
    </div>
  );
}
