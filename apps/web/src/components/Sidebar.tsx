"use client";

import { clsx } from "clsx";
import { BarChart3, Briefcase, CalendarClock, EyeOff, LayoutDashboard, LogOut, Menu, Settings, Users, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useBlind } from "@/lib/use-blind";
import { Avatar, Logo, ThemeToggle } from "./ui";

const NAV = [
  { href: "/panel", label: "Genel bakış", icon: LayoutDashboard, exact: true },
  { href: "/panel/ilanlar", label: "İlanlar", icon: Briefcase },
  { href: "/panel/adaylar", label: "Adaylar", icon: Users },
  { href: "/panel/mulakatlar", label: "Mülakatlar", icon: CalendarClock },
  { href: "/panel/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { me, logout } = useAuth();
  const { connected } = useLive();
  const { blind, toggle } = useBlind();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-gradient-to-b from-brand-400 to-fuchsia-400" />}
            <Icon className={clsx("size-[18px] transition", active ? "text-brand-300" : "group-hover:scale-110")} />
            {label}
          </Link>
        );
      })}
      <div className="mt-4 border-t border-white/5 pt-4">
        <button
          onClick={toggle}
          className={clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
            blind ? "bg-amber-400/10 text-amber-300" : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
          title="Aday adlarını ve iletişim bilgilerini gizler"
        >
          <EyeOff className="size-[18px] shrink-0" />
          <span className="whitespace-nowrap">Kör değerlendirme</span>
          <span className={clsx("ml-auto h-5 w-9 shrink-0 rounded-full p-0.5 transition", blind ? "bg-amber-400" : "bg-white/10")}>
            <span className={clsx("block size-4 rounded-full bg-white transition", blind && "translate-x-4")} />
          </span>
        </button>
        {me && (
          <a href={`/kariyer/${me.company.slug}`} target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
            <ExternalLink className="size-[18px]" /> Kariyer sayfası
          </a>
        )}
      </div>
    </nav>
  );

  const footer = me && (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
      <Avatar name={me.user.name} id={me.user.id} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{me.user.name}</p>
        <p className="truncate text-xs text-slate-400">{roleLabel[me.role]}</p>
      </div>
      <button onClick={logout} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Çıkış yap" title="Çıkış yap">
        <LogOut className="size-4" />
      </button>
    </div>
  );

  const header = (
    <div className="mb-8 flex items-center justify-between px-1">
      <Link href="/panel">
        <Logo light />
      </Link>
      <span className={clsx("flex items-center gap-1.5 text-[11px] font-medium", connected ? "text-emerald-400" : "text-slate-500")} title={connected ? "Canlı güncellemeler açık" : "Bağlanıyor…"}>
        <span className={clsx("size-1.5 rounded-full", connected ? "animate-pulse bg-emerald-400" : "bg-slate-500")} />
        {connected ? "Canlı" : "…"}
      </span>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0f0f1a] p-5 lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-600/20 to-transparent" />
        <div className="relative flex flex-1 flex-col">
          {header}
          {me && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{me.company.name}</p>}
          {nav}
          {footer}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#0b0b12]/80">
        <Link href="/panel"><Logo /></Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} className="rounded-xl p-2" aria-label="Menü"><Menu className="size-5" /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-fade-up flex-col bg-[#0f0f1a] p-5">
            <button onClick={() => setOpen(false)} className="absolute top-5 right-4 text-slate-400" aria-label="Kapat"><X className="size-5" /></button>
            {header}
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
