import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Camera,
  ImageUp,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  TreePine,
  X,
} from "lucide-react";

type IdentifyResult = {
  speciesId: string | null;
  name: string;
  latin: string;
  confidence: number;
  note: string;
  alternatives: { speciesId: string | null; name: string; latin: string }[];
};

/** Görüntüyü uzun kenarı 1024px olacak şekilde JPEG'e küçült (hız için kritik) */
async function downscale(source: HTMLVideoElement | File): Promise<Blob> {
  let bmp: ImageBitmap;
  if (source instanceof File) {
    bmp = await createImageBitmap(source);
  } else {
    const w = source.videoWidth;
    const h = source.videoHeight;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1024 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.82),
    );
  }
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.82));
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

export default function Identify() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cameraState, setCameraState] = useState<"idle" | "on" | "denied">("idle");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraState("idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("on");
    } catch {
      setCameraState("denied");
      setError("Kameraya erişilemedi. İzin verdiğinizden emin olun ya da galeriden fotoğraf yükleyin.");
    }
  };

  const identify = trpc.identify.tree.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setBusy(false);
    },
    onError: (e) => {
      setError(e.message);
      setBusy(false);
    },
  });

  const runIdentify = async (blob: Blob) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(blob));
    const b64 = await blobToBase64(blob);
    identify.mutate({ imageBase64: b64 });
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const blob = await downscale(videoRef.current);
    stopCamera();
    await runIdentify(blob);
  };

  const pickFile = async (f: File) => {
    const blob = await downscale(f);
    await runIdentify(blob);
  };

  const reset = () => {
    setResult(null);
    setPreview(null);
    setError(null);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <Camera className="h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">Tür tanıma için giriş yapın</h1>
        <p className="text-sm text-muted-foreground">
          Fotoğraftan ağaç türü tanıma özelliğini kullanmak için hesabınızla giriş yapmanız gerekiyor.
        </p>
        <Button onClick={() => navigate("/login")} className="rounded-full px-8">
          Giriş Yap
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ScanLine className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Ağacı Tanı</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kamerayı ağaca doğrultun veya galeriden bir fotoğraf seçin — yapay zekâ türünü tahmin etsin.
        </p>
      </div>

      {/* Kamera / önizleme alanı */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-black/90">
        {preview ? (
          <img src={preview} alt="Çekilen fotoğraf" className="h-full w-full object-contain" />
        ) : cameraState === "on" ? (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
            <TreePine className="h-14 w-14 text-white/30" />
            <p className="max-w-xs text-center text-sm">
              Yaprak ve kabuk görünür olacak şekilde ağaca yaklaşın; net bir kare yakalayın.
            </p>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
            <p className="text-sm font-medium">Yapay zekâ inceliyor…</p>
            <p className="text-xs text-white/60">Bu birkaç saniye sürebilir</p>
          </div>
        )}
      </div>

      {/* Kontroller */}
      {!result && !busy && (
        <div className="mt-5 flex items-center justify-center gap-3">
          {cameraState === "on" ? (
            <>
              <Button variant="outline" className="rounded-full" onClick={stopCamera}>
                <X className="mr-1.5 h-4 w-4" /> Kapat
              </Button>
              <button
                onClick={capture}
                aria-label="Fotoğraf çek"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary bg-white shadow-lg transition-transform active:scale-90"
              >
                <Camera className="h-6 w-6 text-primary" />
              </button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => fileRef.current?.click()}
              >
                <ImageUp className="mr-1.5 h-4 w-4" /> Galeri
              </Button>
            </>
          ) : (
            <>
              <Button onClick={startCamera} className="h-12 rounded-full px-6">
                <Camera className="mr-2 h-4 w-4" /> Kamerayı Aç
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full px-6"
                onClick={() => fileRef.current?.click()}
              >
                <ImageUp className="mr-2 h-4 w-4" /> Fotoğraf Yükle
              </Button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Sonuç kartı */}
      {result && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Tanıma Sonucu
            <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
              %{Math.round(result.confidence * 100)} güven
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold">{result.name}</h2>
            <p className="text-sm italic text-muted-foreground">{result.latin}</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.note}</p>

            {result.alternatives.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diğer olasılıklar
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.alternatives.map((a, i) =>
                    a.speciesId ? (
                      <Link
                        key={i}
                        to={`/tur/${a.speciesId}`}
                        className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        {a.name} <span className="italic opacity-60">({a.latin})</span>
                      </Link>
                    ) : (
                      <span
                        key={i}
                        className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {a.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {result.speciesId && (
                <>
                  <Button asChild className="rounded-full">
                    <Link to={`/tur/${result.speciesId}`}>Tür Kartını Aç</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={`/katki?tur=${result.speciesId}`}>Bu türle gözlem ekle</Link>
                  </Button>
                </>
              )}
              <Button variant="ghost" className="rounded-full" onClick={reset}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Yeni fotoğraf
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tahminler yapay zekâ tarafından üretilir; kesin teşhis için tür kartındaki akademik verileri inceleyin.
      </p>
    </div>
  );
}
