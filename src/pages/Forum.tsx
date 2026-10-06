import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { MessageSquare, Eye, PlusCircle, Search, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "react-router";
import { toast } from "sonner";

const CATS = ["genel", "belirleme", "arastirma", "etkinlik"] as const;
type Cat = (typeof CATS)[number];

const CAT_COLORS: Record<Cat, string> = {
  genel: "#64748b",
  belirleme: "#c2703d",
  arastirma: "#2f5233",
  etkinlik: "#96742a",
};

function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export default function Forum() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Cat | null>(null);
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newCat, setNewCat] = useState<Cat>("genel");

  const { data: posts, isLoading } = trpc.forum.list.useQuery({
    category: cat ?? undefined,
    search: q || undefined,
  });
  const utils = trpc.useUtils();
  const create = trpc.forum.create.useMutation({
    onSuccess: (r) => {
      setComposer(false);
      setTitle("");
      setContent("");
      utils.forum.list.invalidate();
      navigate(`/forum/${r.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:pb-12">
      <div className="flex items-end justify-between animate-fade-up">
        <div>
          <h1 className="font-serif-d text-3xl font-bold sm:text-4xl">{t("forum.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tür belirleme, araştırma notları, saha buluşmaları — bilgi ağını birlikte örelim.
          </p>
        </div>
        <Button
          onClick={() => (isAuthenticated ? setComposer(true) : navigate("/login"))}
          className="hidden h-11 gap-1.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 sm:flex dark:bg-emerald-600"
        >
          <PlusCircle className="h-4 w-4" /> {t("forum.newPost")}
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Konu ara…"
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setCat(null)}
          className={cn(
            "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold",
            !cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
          )}
        >
          {t("common.all")}
        </button>
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(cat === c ? null : c)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold",
              cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            {t(`forum.cat.${c}` as const)}
          </button>
        ))}
      </div>

      {composer && (
        <div className="animate-fade-up mt-5 rounded-3xl border border-border bg-card p-5 shadow-md">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("forum.postTitle")}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold outline-none focus:border-primary/50"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("forum.postContent")}
            className="mt-3 min-h-[120px] resize-none rounded-xl"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewCat(c)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-semibold",
                    newCat === c ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {t(`forum.cat.${c}` as const)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setComposer(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="rounded-full"
                disabled={title.trim().length < 3 || content.trim().length < 3 || create.isPending}
                onClick={() => create.mutate({ title: title.trim(), content: content.trim(), category: newCat })}
              >
                {t("common.send")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}
        {posts?.map((p, i) => (
          <Link
            key={p.id}
            to={`/forum/${p.id}`}
            className="animate-fade-up block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: CAT_COLORS[p.category as Cat] }}
              >
                {t(`forum.cat.${p.category as Cat}` as const)}
              </span>
              <span className="text-[11px] text-muted-foreground">{timeAgo(p.createdAt)}</span>
            </div>
            <h3 className="mt-2 text-[15px] font-bold leading-snug">{p.title}</h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {p.content}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">{p.authorName ?? "Üye"}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {p.commentCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {p.views}
              </span>
            </div>
          </Link>
        ))}
        {posts?.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Henüz konu yok — ilk konuyu siz açın!
          </p>
        )}
      </div>

      {/* Mobil FAB */}
      <button
        onClick={() => (isAuthenticated ? setComposer(true) : navigate("/login"))}
        className="fixed bottom-24 right-4 z-[900] flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xl transition-transform active:scale-90 sm:hidden dark:bg-emerald-600"
      >
        <PlusCircle className="h-6 w-6" />
      </button>
    </div>
  );
}

export function ForumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const { isAuthenticated, user } = useAuth();
  const [text, setText] = useState("");
  const postId = Number(id);

  const { data: post, isLoading } = trpc.forum.byId.useQuery({ id: postId }, { enabled: !!postId });
  const { data: comments } = trpc.comments.list.useQuery(
    { targetType: "post", targetId: postId },
    { enabled: !!postId },
  );
  const utils = trpc.useUtils();
  const add = trpc.comments.add.useMutation({
    onSuccess: () => {
      setText("");
      utils.comments.list.invalidate();
      utils.forum.list.invalidate();
    },
  });
  const removePost = trpc.forum.remove.useMutation({
    onSuccess: () => navigate("/forum"),
  });

  if (isLoading)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!post) return null;

  const canDelete = user && (user.id === post.userId || user.role === "admin");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <button
        onClick={() => navigate("/forum")}
        className="mb-5 flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t("nav.forum")}
      </button>

      <article className="animate-fade-up rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: CAT_COLORS[post.category as Cat] }}
          >
            {t(`forum.cat.${post.category as Cat}` as const)}
          </span>
          {canDelete && (
            <button
              onClick={() => removePost.mutate({ id: post.id })}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <h1 className="font-serif-d mt-3 text-2xl font-bold leading-snug sm:text-3xl">{post.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {(post.authorName ?? "??").slice(0, 2).toUpperCase()}
          </span>
          <span className="font-semibold text-foreground/80">{post.authorName ?? "Üye"}</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {post.views}
          </span>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-[1.85]">{post.content}</p>
      </article>

      <section className="mt-6">
        <h2 className="text-sm font-bold">
          {t("common.comments")} ({comments?.length ?? 0})
        </h2>
        <div className="mt-4 space-y-3">
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {(c.authorName ?? "??").slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">{c.authorName ?? "Üye"}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {isAuthenticated ? (
          <div className="mt-5 flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Yorumunuzu yazın…"
              className="min-h-[52px] flex-1 resize-none rounded-2xl"
            />
            <Button
              onClick={() =>
                text.trim() &&
                add.mutate({ targetType: "post", targetId: postId, content: text.trim() })
              }
              disabled={!text.trim() || add.isPending}
              className="h-12 rounded-2xl"
            >
              {t("common.send")}
            </Button>
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Yorum yapmak için{" "}
            <Link to="/login" className="font-bold text-primary underline">
              giriş yapın
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
