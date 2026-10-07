import { Link } from "react-router";
import { CATEGORY_META, type Species } from "@contracts/species";
import { MapPin, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SpeciesCard({ species, index = 0 }: { species: Species; index?: number }) {
  const meta = CATEGORY_META[species.category];
  return (
    <Link
      to={`/tur/${species.id}`}
      className="group animate-fade-up overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative h-32 overflow-hidden" style={{ backgroundColor: meta.color }}>
        <img
          src={`/species/${species.id}.jpg`}
          alt={species.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-700 backdrop-blur dark:bg-black/50 dark:text-stone-200">
          {meta.label}
        </span>
        {species.tag && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-950/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 backdrop-blur">
            {species.tag}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif-d text-lg font-semibold leading-snug">{species.name}</h3>
            <p className="text-xs italic text-muted-foreground">{species.latin}</p>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {species.desc}
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">
            {species.regions.slice(0, 3).map((r) => r.district.split(" / ")[0]).join(" · ")}
            {species.regions.length > 3 && ` +${species.regions.length - 3}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CategoryBadge({ category }: { category: Species["category"] }) {
  const meta = CATEGORY_META[category];
  return (
    <Badge
      variant="secondary"
      className="rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      {meta.label}
    </Badge>
  );
}
