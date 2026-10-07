import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  Map as MapIcon,
  ArrowRight,
  TreePine,
  Camera,
  BookOpen,
  Users,
  MapPin,
} from "lucide-react";
import { HOTSPOTS, TURKEY_CENTER } from "@contracts/species";
import { useSpecies } from "@/providers/species";
import { useLang } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import SpeciesCard from "@/components/SpeciesCard";
import AtlasMap from "@/components/map/AtlasMap";

const FEATURED_IDS = ["zeytin", "kizilcam", "sakiz", "bozdag-goknari", "fistikcami", "cinar"];

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: stats } = trpc.stats.overview.useQuery();

  const { species: ALL_SPECIES, districts: DISTRICTS, byId } = useSpecies();
  const featured = FEATURED_IDS.map((id) => byId.get(id)!).filter(Boolean);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/kutuphane?q=${encodeURIComponent(q.trim())}` : "/kutuphane");
  };

  const statItems = [
    { icon: TreePine, label: t("home.statsSpecies"), value: ALL_SPECIES.length },
    { icon: MapPin, label: t("home.statsRegions"), value: DISTRICTS.length },
    { icon: Camera, label: t("home.statsObs"), value: stats?.totals.observations ?? 0 },
    { icon: Users, label: t("home.statsMembers"), value: stats?.totals.users ?? 0 },
  ];

  return (
    <div className="pb-24 lg:pb-10">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-emerald-800/10 blur-3xl dark:bg-emerald-400/10" />
          <div className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-amber-600/10 blur-3xl dark:bg-amber-300/10" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {t("footer.mission")}
            </span>
            <h1 className="font-serif-d mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.heroSub")}
            </p>

            <form onSubmit={submitSearch} className="mt-7 flex max-w-lg items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("common.searchSpecies")}
                  className="h-13 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  style={{ height: 52 }}
                />
              </div>
              <button
                type="submit"
                className="flex h-[52px] items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                {t("common.search")}
              </button>
            </form>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/harita"
                className="flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-800 hover:shadow-xl active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <MapIcon className="h-4 w-4" /> {t("home.exploreMap")}
              </Link>
              <Link
                to="/kutuphane"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                <BookOpen className="h-4 w-4" /> {t("home.browseLibrary")}
              </Link>
            </div>
          </div>

          {/* Hero mini harita */}
          <div className="animate-fade-up relative h-[380px] overflow-hidden rounded-[28px] border border-border shadow-2xl lg:h-[460px]" style={{ animationDelay: "120ms" }}>
            <AtlasMap interactive={false} showCommunity={false} zoom={6} />
            <div className="glass absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl px-4 py-3 shadow-lg">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nav.map")}
                </p>
                <p className="text-sm font-bold">
                  {ALL_SPECIES.reduce((a, s) => a + s.regions.length, 0)} yayılış noktası
                </p>
              </div>
              <Link
                to="/harita"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* İstatistik şeridi */}
        <div className="border-y border-border/70 bg-card/60">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border/70 px-4 sm:grid-cols-4 sm:divide-x sm:px-6">
            {statItems.map((s) => (
              <div key={s.label} className="flex items-center gap-3 py-5 sm:justify-center">
                <s.icon className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SICAK NOKTALAR */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              {TURKEY_CENTER[0].toFixed(1)}°K · Anadolu
            </p>
            <h2 className="font-serif-d mt-1 text-2xl font-bold sm:text-3xl">{t("home.hotspots")}</h2>
          </div>
          <Link to="/harita" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex">
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {HOTSPOTS.slice(0, 6).map((h, i) => (
            <Link
              key={h.name}
              to={`/harita?lat=${h.coords[0]}&lng=${h.coords[1]}`}
              className="group animate-fade-up flex min-w-[200px] items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {h.coords[0].toFixed(2)}°K, {h.coords[1].toFixed(2)}°D
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ÖNE ÇIKAN TÜRLER */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif-d text-2xl font-bold sm:text-3xl">{t("home.featured")}</h2>
          <Link to="/kutuphane" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s, i) => (
            <SpeciesCard key={s.id} species={s} index={i} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-2xl" />
          <Camera className="animate-float-slow mx-auto h-10 w-10 opacity-90" />
          <h2 className="font-serif-d mx-auto mt-4 max-w-xl text-2xl font-bold sm:text-3xl">
            Sahada bir ağaç mı gördünüz?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed opacity-90">
            Fotoğrafını çekin, konumuyla birlikte haritaya ekleyin. Her gözlem, Türkiye'nin
            biyoçeşitlilik envanterini birlikte büyütmemizi sağlıyor.
          </p>
          <Link
            to="/katki"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-emerald-900 shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            {t("nav.contribute")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        Türkiye Ağaç Atlası — {t("footer.mission")} · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
