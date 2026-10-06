import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router";
import {
  ALL_SPECIES,
  CATEGORY_META,
  TURKEY_CENTER,
  getSpeciesById,
  type Category,
} from "@contracts/species";
import { trpc } from "@/providers/trpc";

/* Kategori renginde yuvarlak ikon */
function speciesIcon(category: Category, size = 26, pulse = false) {
  const meta = CATEGORY_META[category];
  return L.divIcon({
    className: "",
    html: `<div class="atlas-marker ${pulse ? "marker-pulse" : ""}" style="width:${size}px;height:${size}px;background:${meta.color}">
      <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7"/><path d="M9 15H5.5a2.5 2.5 0 0 1-2.36-3.3l1.6-4.7a2 2 0 0 1 3.56-.6"/><path d="M15 15h3.5a2.5 2.5 0 0 0 2.36-3.3l-1.6-4.7a2 2 0 0 0-3.56-.6"/><circle cx="12" cy="6" r="4"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function communityIcon(size = 22) {
  return L.divIcon({
    className: "",
    html: `<div class="atlas-marker" style="width:${size}px;height:${size}px;background:#c2703d">
      <svg width="${size * 0.58}" height="${size * 0.58}" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function pickIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="atlas-marker marker-pulse" style="width:30px;height:30px;background:#0f766e">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoom != null) map.flyTo(center, zoom, { duration: 0.8 });
    else map.flyTo(center, map.getZoom(), { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* Topluluk gözlemi popup'ı (fotoğraf imzalı URL ile) */
function ObservationPopup({ obs }: { obs: any }) {
  const species = getSpeciesById(obs.speciesId);
  const { data: photo } = trpc.observations.photoUrl.useQuery(
    { key: obs.photoKey },
    { enabled: !!obs.photoKey, staleTime: 5 * 60 * 1000 },
  );
  return (
    <div className="w-56">
      {photo?.url && (
        <img
          src={photo.url}
          alt=""
          className="mb-2 h-32 w-full rounded-xl object-cover"
          loading="lazy"
        />
      )}
      <p className="text-sm font-bold">
        {species ? species.name : obs.customName ?? "Bilinmeyen tür"}
      </p>
      {species && (
        <p className="text-xs italic text-stone-500 dark:text-stone-400">{species.latin}</p>
      )}
      {obs.note && <p className="mt-1 line-clamp-2 text-xs">{obs.note}</p>}
      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
        <span>{obs.district ?? "Türkiye"}</span>
        <span>{obs.authorName ?? "Gözlemci"}</span>
      </div>
    </div>
  );
}

export interface AtlasMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  showCatalogue?: boolean;
  speciesFilter?: string | null;
  categoryFilter?: Category | null;
  showCommunity?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickPoint?: [number, number] | null;
  flyTarget?: { center: [number, number]; zoom?: number } | null;
  interactive?: boolean;
}

export default function AtlasMap({  center = TURKEY_CENTER,
  zoom = 9,
  className,
  showCatalogue = true,
  speciesFilter = null,
  categoryFilter = null,
  showCommunity = true,
  onPick,
  pickPoint,
  flyTarget,
  interactive = true,
}: AtlasMapProps) {
  const { data: community } = trpc.observations.list.useQuery(
    { speciesId: speciesFilter ?? undefined, limit: 150 },
    { enabled: showCommunity },
  );

  const catalogueMarkers = useMemo(() => {
    if (!showCatalogue) return [];
    return ALL_SPECIES.filter(
      (s) =>
        (!speciesFilter || s.id === speciesFilter) &&
        (!categoryFilter || s.category === categoryFilter),
    ).flatMap((s) =>
      s.regions.map((r, i) => ({
        key: `${s.id}-${i}`,
        species: s,
        region: r,
      })),
    );
  }, [showCatalogue, speciesFilter, categoryFilter]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className ?? "h-full w-full"}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      attributionControl
      style={{ position: "absolute", inset: 0 }}
    >
      <TileLayer
        key="osm"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {flyTarget && <Recenter center={flyTarget.center} zoom={flyTarget.zoom} />}
      {onPick && <ClickPicker onPick={onPick} />}

      {catalogueMarkers.map((m) => (
        <Marker
          key={m.key}
          position={m.region.coords}
          icon={speciesIcon(m.species.category)}
        >
          <Popup>
            <div className="w-52">
              <p className="text-sm font-bold">{m.species.name}</p>
              <p className="text-xs italic text-stone-500 dark:text-stone-400">
                {m.species.latin}
              </p>
              <p className="mt-1.5 text-xs font-medium">{m.region.district}</p>
              <p className="text-xs text-stone-600 dark:text-stone-300">{m.region.note}</p>
              <Link
                to={`/tur/${m.species.id}`}
                className="popup-cta mt-2 inline-block rounded-lg bg-emerald-700 px-3 py-1 text-[11px] font-semibold"
              >
                Tür Kartını Aç →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {showCommunity &&
        community?.map((o) => (
          <Marker key={`obs-${o.id}`} position={[o.lat, o.lng]} icon={communityIcon()}>
            <Popup>
              <ObservationPopup obs={o} />
            </Popup>
          </Marker>
        ))}

      {pickPoint && <Marker position={pickPoint} icon={pickIcon()} />}
    </MapContainer>
  );
}

export { TURKEY_CENTER };
