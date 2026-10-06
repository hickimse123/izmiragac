import { useRef, useState } from "react";
import {
  Loader2,
  Camera,
  MessageSquare,
  Heart,
  FileText,
  Bell,
  Trash2,
  Pencil,
  ImagePlus,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { getSpeciesById } from "@contracts/species";

/** Dosyayı JPEG'e küçültüp base64 döndür */
async function fileToBase64(file: File, maxW: number): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.85),
  );
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { t } = useLang();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const { data: mine } = trpc.stats.mine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myObs } = trpc.observations.list.useQuery({ limit: 100 }, { enabled: isAuthenticated });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setEditing(false);
      toast.success("Profil güncellendi");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateAvatar = trpc.auth.updateAvatar.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Profil fotoğrafı güncellendi");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateBanner = trpc.auth.updateBanner.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Kapak fotoğrafı güncellendi");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeObs = trpc.observations.remove.useMutation({
    onSuccess: () => {
      utils.observations.list.invalidate();
      utils.stats.mine.invalidate();
      toast.success("Gözlem silindi");
    },
  });

  if (isLoading || !isAuthenticated)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  const mineObs = (myObs ?? []).filter((o) => o.userId === user?.id);
  const uploading = updateAvatar.isPending || updateBanner.isPending;

  const stats = [
    { icon: Camera, label: t("dash.myObs"), value: mine?.observations ?? 0 },
    { icon: FileText, label: t("dash.myPosts"), value: mine?.posts ?? 0 },
    { icon: MessageSquare, label: t("dash.myComments"), value: mine?.comments ?? 0 },
    { icon: Heart, label: t("dash.likesReceived"), value: mine?.likesReceived ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-0 pb-24 sm:px-6 lg:pb-12">
      {/* ---------- Kapak + avatar (sosyal medya tarzı) ---------- */}
      <div className="relative">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 sm:mt-6 sm:rounded-3xl">
          {user?.bannerUrl && (
            <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />
          )}
          <button
            onClick={() => bannerInput.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            {updateBanner.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            Kapağı Değiştir
          </button>
          <input
            ref={bannerInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const b64 = await fileToBase64(f, 1600);
              updateBanner.mutate({ contentBase64: b64, contentType: "image/jpeg" });
            }}
          />
        </div>

        <div className="relative px-4">
          <div className="absolute -top-12 left-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInput.current?.click()}
                disabled={uploading}
                aria-label="Profil fotoğrafını değiştir"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
              >
                {updateAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const b64 = await fileToBase64(f, 512);
                  updateAvatar.mutate({ contentBase64: b64, contentType: "image/jpeg" });
                }}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            {!editing ? (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setNameDraft(user?.name ?? "");
                  setBioDraft(user?.bio ?? "");
                  setEditing(true);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Profili Düzenle
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={updateProfile.isPending}
                  onClick={() => updateProfile.mutate({ name: nameDraft, bio: bioDraft })}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Kaydet
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setEditing(false)}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Vazgeç
                </Button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="mt-2">
              <h1 className="font-serif-d text-2xl font-bold sm:text-3xl">{user?.name}</h1>
              {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              {user?.bio ? (
                <p className="mt-2 max-w-lg text-sm leading-relaxed">{user.bio}</p>
              ) : (
                <p className="mt-2 text-sm italic text-muted-foreground">
                  Henüz bir biyografi eklenmemiş — “Profili Düzenle” ile kendini tanıt.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Katılım: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          ) : (
            <div className="mt-2 max-w-lg space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ad</label>
                <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={60} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Biyografi <span className="font-normal">({bioDraft.length}/280)</span>
                </label>
                <Textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Kendinden, doğa ilginden bahset…"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Sayaçlar ---------- */}
      <div className="mt-6 grid grid-cols-4 gap-2 px-4 sm:gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card px-2 py-4 text-center shadow-sm"
          >
            <p className="text-xl font-bold tabular-nums sm:text-2xl">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 px-4 lg:grid-cols-2">
        {/* ---------- Gözlemlerim ---------- */}
        <section className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{t("dash.myObs")}</h2>
            <Link to="/kutuphane" className="text-xs font-bold text-primary hover:underline">
              + {t("nav.contribute")}
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {mineObs.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Henüz gözlem eklemediniz.
              </p>
            )}
            {mineObs.map((o) => {
              const sp = getSpeciesById(o.speciesId);
              return (
                <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <Camera className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">
                      {sp?.name ?? o.customName ?? "Bilinmeyen tür"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.district ?? "İzmir"} · {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" /> {o.likes}
                  </span>
                  <button
                    onClick={() => removeObs.mutate({ id: o.id })}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Bildirimler ---------- */}
        <section className="animate-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Bell className="h-4 w-4" /> {t("dash.notifications")}
          </h2>
          <div className="mt-3 space-y-2">
            {(!notifications || notifications.length === 0) && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("dash.noNotifications")}
              </p>
            )}
            {notifications?.map((n) => (
              <button
                key={`${n.targetType}-${n.id}`}
                onClick={() =>
                  navigate(n.targetType === "post" ? `/forum/${n.targetId}` : "/harita")
                }
                className="w-full rounded-xl border border-border/60 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary"
              >
                <p className="line-clamp-1 text-[13px]">
                  <span className="font-bold">{n.authorName ?? "Bir üye"}</span>
                  <span className="text-muted-foreground">
                    {n.targetType === "post" ? " · konunuza yorum yaptı" : " · gözleminize yorum yaptı"}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.content}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
