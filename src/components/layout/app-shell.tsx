"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Compass,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Tv,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { SafeUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/anime", label: "Browse Anime", icon: Compass },
  { href: "/library", label: "My Library", icon: Library },
  { href: "/parties", label: "Watch Parties", icon: Tv },
  { href: "/reviews", label: "My Reviews", icon: MessageSquareText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children, liveCount = 0 }: { user: SafeUser; children: ReactNode; liveCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isRoom = /^\/parties\/[A-Z0-9]+$/i.test(pathname ?? "") && pathname !== "/parties/new";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand/15 text-violet-200" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand to-brand-2" />}
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-violet-300" : "text-muted group-hover:text-fg")} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/parties" && liveCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                    {liveCount} live
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/15 via-surface-2 to-brand-2/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-violet-300" />
            Host a watch party
          </div>
          <p className="mt-1 text-xs text-muted">Sync playback and chat with up to 10 friends.</p>
          <ButtonLink href="/parties/new" size="sm" className="mt-3 w-full">
            <Plus className="h-4 w-4" /> New party
          </ButtonLink>
        </div>

        <div className="border-t border-border p-3">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
            <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
          </Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 glass sm:px-6">
          <button className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <SearchBox />
          </div>
          <ButtonLink href="/parties/new" size="sm" variant="secondary" className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Party
          </ButtonLink>
          <UserMenu user={user} />
        </header>

        <main className={cn("flex-1", isRoom ? "p-0" : "px-4 py-6 sm:px-6 lg:px-8")}>{children}</main>
      </div>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 shadow-glow", className)}>
      <Tv className="h-4 w-4 text-white" />
    </span>
  );
}

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    if (pathname === "/anime") setValue(params.get("q") ?? "");
  }, [params, pathname]);

  return (
    <form
      className="relative max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/anime?q=${encodeURIComponent(q)}` : "/anime");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search anime, studios…"
        className="h-10 w-full rounded-xl border border-border bg-surface-2/60 pl-9 pr-3 text-sm placeholder:text-muted/70 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </form>
  );
}

function UserMenu({ user }: { user: SafeUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-surface-2" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
        <ChevronDown className={cn("h-4 w-4 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 animate-pop overflow-hidden rounded-2xl border border-border bg-surface shadow-card" role="menu">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link href="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg" role="menuitem">
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-danger/10 hover:text-danger" role="menuitem">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
