import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Camera, MapPin, CheckCircle2, Loader2, ImagePlus } from "lucide-react";
import AtlasMap, { TURKEY_CENTER } from "@/components/map/AtlasMap";
import { useSpecies } from "@/providers/species";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Fotoğrafı uzun kenarı 1600px olacak şekilde JPEG'e küçültüp base64 döndürür.
 * (Vercel fonksiyonlarında istek gövdesi en fazla 4,5 MB olduğu için şarttır.)
 */
async function photoToBase64(file: File): Promise<{ base64: string; type: string; name: string }> {
  const readAsBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.85),
    );
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return { base64: await readAsBase64(blob), type: "image/jpeg", name: `${base}.jpg` };
  } catch {
    // Tarayıcı biçimi çözemediyse (örn. HEIC) orijinali yalnızca küçükse gönder
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("Bu fotoğraf biçimi küçültülemedi; lütfen JPG/PNG yükleyin.");
    }
    return { base64: await readAsBase64(file), type: file.type || "image/jpeg", name: file.name };
  }
}

export default function Contribute() {
  const { t } = useLang();
  const { species: ALL_SPECIES, districts: DISTRICTS, byId: speciesById } = useSpecies();
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();

  const [speciesId, setSpeciesId] = useState<string>(params.get("tur") ?? "");
  const [customName, setCustomName] = useState("");
  const [district, setDistrict] = useState("");
  const [note, setNote] = useState("");
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const create = trpc.observations.create.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success(t("contrib.success"));
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pickPhoto = (f: File | null) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return toast.error("Fotoğraf 25 MB sınırını aşıyor");
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPoint([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error("Konum alınamadı; haritadan elle seçebilirsiniz"),
      { enableHighAccuracy: true },
    );
  };

  const submit = async () => {
    if (!speciesId) return toast.error(t("contrib.selectSpecies"));
    if (!point) return toast.error(t("map.clickToPick"));
    let photoPayload;
    if (photo) {
      try {
        const p = await photoToBase64(photo);
        photoPayload = { name: p.name, contentBase64: p.base64, contentType: p.type };
      } catch (e) {
        return toast.error(e instanceof Error ? e.message : "Fotoğraf hazırlanamadı");
      }
    }
    create.mutate({
      speciesId,
      customName: speciesId === "diger" ? customName : undefined,
      lat: point[0],
      lng: point[1],
      district: district || undefined,
      note: note || undefined,
      photo: photoPayload,
    });
  };

  if (done)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-600" />
        <h1 className="font-serif-d mt-5 text-2xl font-bold">{t("contrib.success")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gözleminiz haritada turuncu işaretçiyle görünecek.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => navigate("/harita")} className="rounded-full">
            {t("nav.map")}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setDone(false);
              setPhoto(null);
              setPreview(null);
              setPoint(null);
              setNote("");
            }}
          >
            Yeni gözlem
          </Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:pb-12">
      <div className="animate-fade-up">
        <h1 className="font-serif-d text-3xl font-bold sm:text-4xl">{t("contrib.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("contrib.subtitle")}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Sol: form */}
        <div className="space-y-5">
          {/* Tür seçimi */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("contrib.selectSpecies")} *
            </label>
            <div className="scrollbar-thin mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {ALL_SPECIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpeciesId(s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-all",
                    speciesId === s.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="block text-[13px] font-semibold">{s.name}</span>
                  <span className="block text-[10px] italic text-muted-foreground">{s.latin}</span>
                </button>
              ))}
              <button
                onClick={() => setSpeciesId("diger")}
                className={cn(
                  "col-span-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-[13px] font-semibold transition-all",
                  speciesId === "diger" ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                {t("contrib.unknown")}
              </button>
            </div>
            {speciesId === "diger" && (
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Tahmini tür adı (isteğe bağlı)"
                className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary/50"
              />
            )}
            {/* Seçili türün örnek fotoğrafı */}
            {speciesId && speciesId !== "diger" && speciesById.get(speciesId)?.photoUrl && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-accent/40 p-2.5">
                <img
                  src={speciesById.get(speciesId)?.photoUrl ?? undefined}
                  alt="Örnek tür fotoğrafı"
                  className="h-16 w-16 rounded-xl object-cover"
                  loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground">Örnek görsel:</span>{" "}
                  seçtiğiniz tür böyle görünür. Gözleminizde gövde, yaprak ve varsa meyveyi
                  kadraja almanız doğrulamayı kolaylaştırır.
                </p>
              </div>
            )}
          </section>

          {/* Fotoğraf */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("contrib.photo")}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className={cn(
                "mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-border transition-colors hover:border-primary/50",
                preview ? "h-56 border-solid" : "h-36",
              )}
            >
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs font-medium">{t("contrib.photoHint")}</span>
                </span>
              )}
            </button>
          </section>

          {/* İlçe + not */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("contrib.district")}
            </label>
            <div className="scrollbar-thin mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDistrict(district === d ? "" : d)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-semibold transition-all",
                    district === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("contrib.note")}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("contrib.noteHint")}
              className="mt-2 min-h-[90px] resize-none rounded-2xl"
            />
          </section>
        </div>

        {/* Sağ: harita konum seçici */}
        <div className="space-y-4">
          <section className="overflow-hidden rounded-3xl border border-border shadow-sm">
            <div className="flex items-center justify-between bg-card px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                {t("contrib.location")} *
              </span>
              <button
                onClick={locate}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-accent"
              >
                {t("map.locate")}
              </button>
            </div>
            <div className="relative h-[420px]">
              <AtlasMap
                showCatalogue={false}
                showCommunity={false}
                center={TURKEY_CENTER}
                zoom={6}
                onPick={(lat, lng) => setPoint([lat, lng])}
                pickPoint={point}
              />
              {!point && (
                <div className="glass pointer-events-none absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-full border border-border/60 px-4 py-2 text-xs font-semibold shadow">
                  {t("map.clickToPick")}
                </div>
              )}
            </div>
            {point && (
              <p className="bg-card px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                Seçilen nokta: {point[0].toFixed(5)}°K, {point[1].toFixed(5)}°D
              </p>
            )}
          </section>

          <Button
            onClick={submit}
            disabled={create.isPending || !speciesId || !point}
            className="h-14 w-full rounded-2xl bg-emerald-700 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600"
          >
            {create.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Camera className="mr-2 h-5 w-5" />
            )}
            {t("contrib.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
