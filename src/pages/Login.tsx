import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";
import { Loader2, TreePine, ChevronDown, Leaf, MapPin, Camera } from "lucide-react";

/**
 * Premium giriş sayfası — kaydırdıkça derinlik kazanan 3B katmanlı orman sahnesi.
 * Scroll ilerledikçe katmanlar farklı hızlarda hareket eder (parallax + translateZ).
 */
export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Scroll ilerlemesini CSS değişkenine yaz (rAF ile kısıtlı)
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        document.documentElement.style.setProperty("--login-p", String(p));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const loginMut = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/");
    },
    onError: (e) => setError(e.message),
  });
  const registerMut = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/");
    },
    onError: (e) => setError(e.message),
  });

  const pending = loginMut.isPending || registerMut.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "login") loginMut.mutate({ email, password });
    else registerMut.mutate({ name, email, password });
  };

  return (
    <div className="relative min-h-[340vh] bg-[#050d08] text-white">
      {/* Sabit 3B sahne */}
      <div
        ref={stageRef}
        className="fixed inset-0 overflow-hidden"
        style={{ perspective: "1200px", ["--login-p" as string]: 0 }}
      >
        {/* Gökyüzü */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, #0d2b1a 0%, #071a10 45%, #040d08 100%)",
            transform:
              "translateZ(-600px) scale(1.6) translateY(calc(var(--login-p, 0) * -40px))",
          }}
        />
        {/* Orman fotoğrafı katmanı */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: "url(/hero-forest.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform:
              "translateZ(-320px) scale(1.35) translateY(calc(var(--login-p, 0) * 90px)) rotateX(calc(var(--login-p, 0) * 6deg))",
            filter: "saturate(1.15) brightness(0.85)",
          }}
        />
        {/* Karanlık vinyet */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(4,13,8,0.25) 0%, rgba(4,13,8,0.55) 55%, rgba(4,13,8,0.95) 100%)",
          }}
        />
        {/* Yüzen yaprak parçacıkları (ön katman) */}
        {[...Array(9)].map((_, i) => (
          <Leaf
            key={i}
            className="absolute text-emerald-300/40"
            style={{
              left: `${(i * 37 + 12) % 100}%`,
              top: `${(i * 53 + 8) % 90}%`,
              width: 18 + ((i * 7) % 22),
              transform: `translateZ(${140 + i * 30}px) translateY(calc(var(--login-p, 0) * ${-60 - i * 35}px)) rotate(${i * 40}deg)`,
              transition: "transform 0.1s linear",
            }}
          />
        ))}

        {/* Başlık katmanı */}
        <div className="absolute inset-x-0 top-[14%] text-center px-6" style={{ transform: "translateZ(-80px) translateY(calc(var(--login-p, 0) * -120px))" }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-950/40 px-4 py-1.5 text-xs tracking-widest uppercase text-emerald-200/90 backdrop-blur">
            <TreePine className="h-3.5 w-3.5" /> Türkiye Ağaç Atlası
          </div>
          <h1
            className="mt-6 text-4xl sm:text-6xl font-bold leading-tight"
            style={{ textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
          >
            Kentin ormanına
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-emerald-400 bg-clip-text text-transparent">
              hoş geldin
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-emerald-100/70">
            Türkiye'nin dört yanından ağaçları keşfet, fotoğrafla türünü tanı,
            gözlemlerinle vatandaş bilimine katkı ver.
          </p>
        </div>

        {/* Kaydırma işareti */}
        <div
          className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-1 text-emerald-200/60 text-xs"
          style={{ opacity: "calc(1 - var(--login-p, 0) * 2.2)" }}
        >
          Keşfetmek için kaydır
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </div>

      {/* Kaydırma yolculuğu içeriği */}
      <div className="relative z-10">
        {/* Giriş kartı — ikinci ekran */}
        <section className="flex min-h-screen items-center justify-center px-4 pt-[100vh]">
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            style={{
              transform:
                "rotateX(calc((1 - min(var(--p, 0) * 3, 1)) * 10deg))",
            }}
          >
            <div className="mb-6 flex rounded-full bg-black/30 p-1 text-sm">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 rounded-full py-2 transition-all ${
                    mode === m
                      ? "bg-emerald-500 text-emerald-950 font-semibold shadow"
                      : "text-emerald-100/70 hover:text-white"
                  }`}
                >
                  {m === "login" ? "Giriş Yap" : "Hesap Oluştur"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-emerald-100/80">
                    Ad Soyad
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adınız"
                    required
                    minLength={2}
                    className="border-white/15 bg-black/30 text-white placeholder:text-white/30 focus-visible:ring-emerald-400"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-emerald-100/80">
                  E-posta
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@eposta.com"
                  required
                  className="border-white/15 bg-black/30 text-white placeholder:text-white/30 focus-visible:ring-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-emerald-100/80">
                  Şifre
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "En az 6 karakter" : "Şifreniz"}
                  required
                  minLength={6}
                  className="border-white/15 bg-black/30 text-white placeholder:text-white/30 focus-visible:ring-emerald-400"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={pending}
                className="w-full bg-emerald-500 py-5 text-base font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Giriş Yap" : "Hesabımı Oluştur"}
              </Button>
            </form>
          </div>
        </section>

        {/* Özellik vitrini — üçüncü ekran */}
        <section className="flex min-h-[100vh] items-center justify-center px-6">
          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: "İnteraktif Atlas",
                desc: "İlçe ilçe yayılış haritaları ve sıcak noktalar",
              },
              {
                icon: Camera,
                title: "Fotoğraftan Tür Tanıma",
                desc: "Ağacı çek, saniyeler içinde türünü öğren",
              },
              {
                icon: Leaf,
                title: "Vatandaş Bilimi",
                desc: "Gözlemlerin akademik veriye dönüşsün",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl"
              >
                <f.icon className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-emerald-100/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="relative z-10 pb-10 text-center text-xs text-emerald-100/40">
          Türkiye Ağaç Atlası — topluluk destekli doğa arşivi
        </footer>
      </div>
    </div>
  );
}
