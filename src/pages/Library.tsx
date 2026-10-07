import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { Search, SlidersHorizontal, X, PlusCircle } from "lucide-react";
import { CATEGORY_META, type Category } from "@contracts/species";
import { useSpecies } from "@/providers/species";
import { useLang } from "@/lib/i18n";
import SpeciesCard from "@/components/SpeciesCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Library() {
  const { t } = useLang();
  const { species: ALL_SPECIES, districts: DISTRICTS } = useSpecies();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<Category | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return ALL_SPECIES.filter((sp) => {
      if (category && sp.category !== category) return false;
      if (district && !sp.regions.some((r) => r.district.includes(district))) return false;
      if (!s) return true;
      return (
        sp.name.toLocaleLowerCase("tr").includes(s) ||
        sp.latin.toLocaleLowerCase("tr").includes(s) ||
        sp.family.toLocaleLowerCase("tr").includes(s) ||
        sp.regions.some((r) => r.district.toLocaleLowerCase("tr").includes(s))
      );
    });
  }, [ALL_SPECIES, q, category, district]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:pb-12">
      <div className="animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
          {ALL_SPECIES.length} {t("common.species").toLocaleLowerCase("tr")} · {DISTRICTS.length} ilçe
        </p>
        <h1 className="font-serif-d mt-1 text-3xl font-bold sm:text-4xl">{t("nav.library")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Her tür kartında habitat, morfoloji, IUCN durumu ve kaynakça içeren akademik veriler bulunur.
        </p>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/katki">
            <PlusCircle className="mr-1.5 h-4 w-4" /> {t("nav.contribute")}
          </Link>
        </Button>
      </div>

      {/* Arama + filtreler */}
      <div className="sticky top-[4.25rem] z-[900] -mx-4 mt-6 bg-background/85 px-4 py-3 backdrop-blur-lg sm:mx-0 sm:rounded-2xl sm:px-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (e.target.value) setParams({ q: e.target.value }, { replace: true });
                else setParams({}, { replace: true });
              }}
              placeholder={t("common.searchSpecies")}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            {q && (
              <button onClick={() => setQ("")} className="rounded-full p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors",
              filtersOpen && "bg-primary text-primary-foreground",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {filtersOpen && (
          <div className="animate-fade-in mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Kategori
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={!category} onClick={() => setCategory(null)} label={t("common.all")} />
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                  <FilterChip
                    key={c}
                    active={category === c}
                    onClick={() => setCategory(category === c ? null : c)}
                    label={t(`cat.${c}` as const)}
                    dot={CATEGORY_META[c].color}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                İlçe / Havza
              </p>
              <div className="scrollbar-thin flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                <FilterChip active={!district} onClick={() => setDistrict(null)} label={t("common.all")} />
                {DISTRICTS.map((d) => (
                  <FilterChip
                    key={d}
                    active={district === d}
                    onClick={() => setDistrict(district === d ? null : d)}
                    label={d}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {results.length} sonuç
      </p>

      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((s, i) => (
          <SpeciesCard key={s.id} species={s} index={i} />
        ))}
      </div>
      {results.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">
          <Search className="mx-auto h-8 w-8 opacity-40" />
          <p className="mt-3 text-sm">Aramanızla eşleşen tür bulunamadı.</p>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
    </button>
  );
}
