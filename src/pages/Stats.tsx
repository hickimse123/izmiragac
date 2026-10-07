import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { CATEGORY_META, type Category } from "@contracts/species";
import { useSpecies } from "@/providers/species";
import { trpc } from "@/providers/trpc";
import { useLang } from "@/lib/i18n";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Stats() {
  const { t } = useLang();
  const { species: ALL_SPECIES } = useSpecies();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: stats } = trpc.stats.overview.useQuery();

  const categoryData = useMemo(() => {
    const counts: Record<Category, number> = { ibreli: 0, yaprakli: 0, maki: 0, meyve: 0 };
    ALL_SPECIES.forEach((s) => counts[s.category]++);
    return (Object.keys(counts) as Category[]).map((c) => ({
      name: t(`cat.${c}` as const),
      value: counts[c],
      color: CATEGORY_META[c].color,
    }));
  }, [t, ALL_SPECIES]);

  const regionData = useMemo(() => {
    const counts = new Map<string, number>();
    ALL_SPECIES.forEach((s) =>
      s.regions.forEach((r) => {
        const d = r.district.split(" / ")[0].trim();
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }),
    );
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [ALL_SPECIES]);

  const topSpecies = useMemo(() => {
    return (stats?.bySpecies ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((r) => ({ name: r.name, value: r.count }));
  }, [stats]);

  const axisColor = isDark ? "#8a9184" : "#78716c";
  const gridColor = isDark ? "#232b23" : "#e7e0d2";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:pb-12">
      <div className="animate-fade-up">
        <h1 className="font-serif-d text-3xl font-bold sm:text-4xl">{t("stats.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Katalog ve topluluk verilerinden gerçek zamanlı üretilen görselleştirmeler.
        </p>
      </div>

      {/* Özet kartları */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("home.statsSpecies"), value: ALL_SPECIES.length },
          { label: t("home.statsObs"), value: stats?.totals.observations ?? 0 },
          { label: t("nav.forum"), value: stats?.totals.posts ?? 0 },
          { label: t("common.comments"), value: stats?.totals.comments ?? 0 },
        ].map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Kategori pasta */}
        <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-bold">{t("stats.byCategory")}</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {categoryData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => (
                    <span style={{ color: axisColor, fontSize: 12 }}>{v}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid " + gridColor,
                    background: isDark ? "#1a221b" : "#fff",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bölge barı */}
        <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" style={{ animationDelay: "80ms" }}>
          <h2 className="text-sm font-bold">İlçelere göre tür çeşitliliği (katalog)</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <BarChart data={regionData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid " + gridColor,
                    background: isDark ? "#1a221b" : "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#2f5233" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zaman serisi */}
        <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-bold">{t("stats.obsTimeline")}</h2>
          <div className="mt-2 h-60">
            {stats?.byMonth && stats.byMonth.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={stats.byMonth} margin={{ left: -18, right: 8 }}>
                  <defs>
                    <linearGradient id="obs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f5233" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#2f5233" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid " + gridColor,
                      background: isDark ? "#1a221b" : "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#2f5233" strokeWidth={2.5} fill="url(#obs)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                İlk topluluk gözlemleri eklendikçe grafik burada canlanacak.
              </div>
            )}
          </div>
        </div>

        {/* En çok gözlemlenen + öncüler */}
        <div className="space-y-6">
          <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" style={{ animationDelay: "160ms" }}>
            <h2 className="text-sm font-bold">{t("stats.topSpecies")}</h2>
            <div className="mt-3 space-y-2.5">
              {topSpecies.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Henüz gözlem yok</p>
              )}
              {topSpecies.map((s, i) => {
                const max = topSpecies[0]?.value || 1;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">{s.value}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-emerald-700 transition-all duration-700 dark:bg-emerald-500"
                        style={{ width: `${(s.value / max) * 100}%`, transitionDelay: `${i * 60}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" style={{ animationDelay: "200ms" }}>
            <h2 className="text-sm font-bold">{t("stats.topContributors")}</h2>
            <div className="mt-3 space-y-2">
              {stats?.topContributors.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  İlk gözlemcilerden biri olun!
                </p>
              )}
              {stats?.topContributors.map((c, i) => (
                <div key={c.userId} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <span className="w-5 text-center text-xs font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.avatar ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {c.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-semibold">{c.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{c.count} gözlem</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
