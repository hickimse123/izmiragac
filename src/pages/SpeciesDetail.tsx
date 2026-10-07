import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Ruler,
  Flower2,
  BookOpen,
  Leaf,
  ShieldCheck,
  Globe2,
  Dna,
  Quote,
  Camera,
  Heart,
} from "lucide-react";
import { CATEGORY_META } from "@contracts/species";
import { useSpecies } from "@/providers/species";
import { useLang } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import AtlasMap from "@/components/map/AtlasMap";
import { CategoryBadge } from "@/components/SpeciesCard";
import { toast } from "sonner";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function ObservationCard({ obs }: { obs: any }) {
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();
  const { data: photo } = trpc.observations.photoUrl.useQuery(
    { key: obs.photoKey },
    { enabled: !!obs.photoKey, staleTime: 5 * 60 * 1000 },
  );
  const like = trpc.observations.toggleLike.useMutation({
    onSuccess: () => utils.observations.list.invalidate(),
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {photo?.url ? (
        <img src={photo.url} alt="" className="h-44 w-full object-cover" loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-accent">
          <Camera className="h-8 w-8 text-accent-foreground/50" />
        </div>
      )}
      <div className="p-3.5">
        {obs.note && <p className="line-clamp-2 text-[13px] leading-relaxed">{obs.note}</p>}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {obs.district ?? "Türkiye"}
          </span>
          <span>{obs.authorName ?? "Gözlemci"}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2.5">
          <button
            onClick={() => {
              if (!isAuthenticated) return toast.error("Beğenmek için giriş yapın");
              like.mutate({ observationId: obs.id });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-rose-600"
          >
            <Heart className="h-4 w-4" /> {obs.likes}
          </button>
          <span className="text-[10px] text-muted-foreground">
            {new Date(obs.createdAt).toLocaleDateString("tr-TR")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SpeciesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const { getSpeciesById, isLoading: speciesLoading } = useSpecies();
  const species = id ? getSpeciesById(id) : undefined;
  const { data: fullSpecies } = trpc.species.byId.useQuery(
    { id: id! },
    { enabled: !!id, staleTime: 5 * 60_000, retry: false },
  );
  const academic = fullSpecies?.academic ?? undefined;
  const [commentText, setCommentText] = useState("");

  const { data: observations } = trpc.observations.list.useQuery(
    { speciesId: id!, limit: 24 },
    { enabled: !!id && !!species },
  );
  const firstObs = observations?.[0];
  const { data: obsComments } = trpc.comments.list.useQuery(
    { targetType: "observation", targetId: firstObs?.id ?? 0 },
    { enabled: !!firstObs },
  );
  const utils = trpc.useUtils();
  const addComment = trpc.comments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.comments.list.invalidate();
      toast.success("Yorumunuz eklendi");
    },
  });

  if (speciesLoading && !species)
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-muted-foreground">Yükleniyor…</div>;

  if (!species)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-semibold">Tür bulunamadı</p>
        <Link to="/kutuphane" className="mt-2 inline-block text-sm text-primary underline">
          Kütüphaneye dön
        </Link>
      </div>
    );

  const meta = CATEGORY_META[species.category];

  return (
    <div className="pb-24 lg:pb-12">
      {/* Başlık bandı — gerçek tür fotoğrafı */}
      <div className="relative overflow-hidden" style={{ backgroundColor: meta.color }}>
        {species.photoUrl && (
          <img
            src={species.photoUrl}
            alt={species.name}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-6 text-white sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={species.category} />
            {species.tag && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                {species.tag}
              </span>
            )}
          </div>
          <h1 className="font-serif-d mt-3 text-3xl font-bold sm:text-5xl">{species.name}</h1>
          <p className="mt-1.5 text-sm italic opacity-85 sm:text-lg">{species.latin}</p>
          <p className="mt-1 text-xs opacity-75 sm:text-sm">{species.family}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 py-8 lg:grid-cols-3">
          {/* Sol: ana içerik */}
          <div className="space-y-8 lg:col-span-2">
            <section className="animate-fade-up">
              <p className="text-[15px] leading-[1.85] text-foreground/90">{species.desc}</p>
            </section>

            {/* Yararlar */}
            <section className="animate-fade-up" style={{ animationDelay: "80ms" }}>
              <h2 className="font-serif-d flex items-center gap-2 text-xl font-bold">
                <Leaf className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                {t("common.benefits")}
              </h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {species.benefits.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-[13px] leading-relaxed shadow-sm"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    {b}
                  </li>
                ))}
              </ul>
            </section>

            {/* Akademik veriler */}
            {academic && (
              <section className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" style={{ animationDelay: "140ms" }}>
                <h2 className="font-serif-d flex items-center gap-2 text-xl font-bold">
                  <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  {t("common.academic")}
                </h2>
                <dl className="mt-5 space-y-4">
                  {[
                    { icon: ShieldCheck, label: t("common.iucn"), value: academic.iucn },
                    { icon: Globe2, label: t("common.habitat"), value: academic.habitat },
                    { icon: MapPin, label: t("common.altitude"), value: academic.altitude },
                    { icon: Dna, label: t("common.morphology"), value: academic.morphology },
                    { icon: Flower2, label: t("common.distribution"), value: academic.distribution },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <row.icon className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="mt-0.5 text-[13.5px] leading-relaxed">{row.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 border-t border-border/70 pt-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Quote className="h-3.5 w-3.5" /> {t("common.references")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {academic.references.map((r, i) => (
                      <li key={i} className="text-xs italic leading-relaxed text-muted-foreground">
                        [{i + 1}] {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Topluluk gözlemleri */}
            <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-serif-d flex items-center gap-2 text-xl font-bold">
                  <Camera className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  {t("common.community")} {t("common.observations").toLocaleLowerCase("tr")}
                </h2>
                <Link to="/katki" className="text-xs font-bold text-primary hover:underline">
                  + {t("nav.contribute")}
                </Link>
              </div>
              {observations && observations.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {observations.map((o) => (
                    <ObservationCard key={o.id} obs={o} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Bu tür için henüz topluluk gözlemi yok. İlk gözlemi siz ekleyin!
                  </p>
                </div>
              )}

              {/* Yorum bölümü (ilk gözlem üzerinden tartışma) */}
              {firstObs && (
                <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-bold">{t("common.comments")}</h3>
                  <div className="mt-3 space-y-3">
                    {obsComments?.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {(c.authorName ?? "??").slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary/70 px-3.5 py-2.5">
                          <p className="text-xs font-bold">{c.authorName ?? "Üye"}</p>
                          <p className="mt-0.5 text-[13px] leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {obsComments?.length === 0 && (
                      <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>
                    )}
                  </div>
                  {isAuthenticated ? (
                    <div className="mt-4 flex gap-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Gözlem hakkında yorum yazın…"
                        className="min-h-[44px] flex-1 resize-none rounded-2xl"
                      />
                      <Button
                        onClick={() =>
                          commentText.trim() &&
                          addComment.mutate({
                            targetType: "observation",
                            targetId: firstObs.id,
                            content: commentText.trim(),
                          })
                        }
                        disabled={!commentText.trim() || addComment.isPending}
                        className="h-11 self-end rounded-2xl"
                      >
                        {t("common.send")}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Yorum yapmak için{" "}
                      <Link to="/login" className="font-bold text-primary underline">
                        giriş yapın
                      </Link>
                      .
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sağ: bilgi paneli + harita */}
          <aside className="space-y-5">
            <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm" style={{ animationDelay: "100ms" }}>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5" /> {t("common.height")}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{species.height}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Flower2 className="h-3.5 w-3.5" /> {t("common.bloom")}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{species.bloom}</dd>
                </div>
              </dl>
            </div>

            <div className="animate-fade-up overflow-hidden rounded-3xl border border-border shadow-sm" style={{ animationDelay: "160ms" }}>
              <div className="relative h-64">
                <AtlasMap
                  interactive={false}
                  showCatalogue
                  speciesFilter={species.id}
                  showCommunity={false}
                  center={species.regions[0].coords}
                  zoom={8}
                />
              </div>
              <div className="bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("common.regions")}
                </p>
                <ul className="mt-2 space-y-2">
                  {species.regions.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                      <span>
                        <span className="font-semibold">{r.district}</span>
                        <span className="text-muted-foreground"> — {r.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
