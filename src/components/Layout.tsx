import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import {
  Map as MapIcon,
  Library,
  MessagesSquare,
  BarChart3,
  PlusCircle,
  Camera,
  Sun,
  Moon,
  TreePine,
  Bell,
  Languages,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

function NotificationsBell() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const navigate = useNavigate();
  if (!isAuthenticated) return null;
  const items = notifications ?? [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {items.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-2">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dash.notifications")}
        </p>
        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("dash.noNotifications")}
            </p>
          )}
          {items.map((n) => (
            <button
              key={`${n.targetType}-${n.id}`}
              onClick={() =>
                navigate(n.targetType === "post" ? `/forum/${n.targetId}` : "/harita")
              }
              className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary"
            >
              <p className="line-clamp-2 text-sm">
                <span className="font-semibold">{n.authorName ?? "Bir üye"}</span>{" "}
                <span className="text-muted-foreground">
                  {n.targetType === "post" ? "konunuza yorum yaptı:" : "gözleminize yorum yaptı:"}
                </span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {n.content}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Tema"
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Languages className="h-4 w-4" />
      {lang.toUpperCase()}
    </button>
  );
}

function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  if (isLoading) return <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />;
  if (!isAuthenticated)
    return (
      <Button
        onClick={() => navigate("/login")}
        className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {t("auth.login")}
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-offset-2 transition-transform hover:scale-105">
          <Avatar className="h-10 w-10 border-2 border-background shadow">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
              {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-2xl">
        <DropdownMenuItem onClick={() => navigate("/panel")} className="rounded-xl">
          <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="rounded-xl text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NAV = [
  { to: "/harita", icon: MapIcon, key: "nav.map" as const },
  { to: "/kutuphane", icon: Library, key: "nav.library" as const },
  { to: "/forum", icon: MessagesSquare, key: "nav.forum" as const },
  { to: "/veri", icon: BarChart3, key: "nav.stats" as const },
];

export default function Layout() {
  const { t } = useLang();
  const location = useLocation();
  const isMapPage = location.pathname === "/harita";
  const [pulse] = useState(true);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Üst bar */}
      <header className="glass fixed inset-x-0 top-0 z-[1000] border-b border-border/60 pt-safe">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105",
                pulse && "marker-pulse",
              )}
            >
              <TreePine className="h-5 w-5" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-[15px] font-bold tracking-tight">Türkiye Ağaç Atlası</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Kent Biyoçeşitliliği
              </span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/15"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                {t(n.key)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/katki">
              <Button className="mr-1 hidden h-10 gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-800 hover:shadow-lg sm:flex dark:bg-emerald-600 dark:hover:bg-emerald-500">
                <PlusCircle className="h-4 w-4" />
                {t("nav.contribute")}
              </Button>
            </Link>
            <LangToggle />
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* İçerik */}
      <main className={cn("flex-1 pt-16", isMapPage && "pt-0")}>
        <Outlet />
      </main>

      {/* Mobil alt gezinme */}
      <nav className="glass fixed inset-x-0 bottom-0 z-[1000] border-t border-border/60 pb-safe lg:hidden">
        <div className="grid grid-cols-5">
          {[...NAV.slice(0, 2), null, ...NAV.slice(2)].map((n, i) =>
            n === null ? (
              <Link
                key="identify"
                to="/tanit"
                className="flex items-center justify-center"
                aria-label={t("nav.identify")}
              >
                <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg transition-transform active:scale-90 dark:bg-emerald-600">
                  <Camera className="h-6 w-6" />
                </span>
              </Link>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <n.icon className="h-5 w-5" />
                {t(n.key)}
                <span className="sr-only">{i}</span>
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
