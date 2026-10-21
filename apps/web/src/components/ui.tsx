"use client";

import { clsx } from "clsx";
import { Loader2, Moon, Sun, X } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { initials, scoreTone, stageMeta } from "@/lib/format";
import type { Stage } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_16px_-6px_rgb(109_40_217/0.6)] hover:brightness-110 active:brightness-95",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-500",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>{children}</span>;
}

export function StageBadge({ stage }: { stage: Stage }) {
  const m = stageMeta[stage];
  return (
    <Badge className={m.soft}>
      <span className={clsx("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </Badge>
  );
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {error ? <span className="block animate-fade-in text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-xl", className)} />;
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-up">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-fuchsia-100 text-brand-600 dark:from-brand-500/15 dark:to-fuchsia-500/10 dark:text-brand-300">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal aria-label={title}>
      <div className="fixed inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx("card relative w-full animate-pop p-6 shadow-2xl dark:bg-[#14141f]", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10" aria-label="Kapat">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const avatarColors = ["from-violet-500 to-fuchsia-500", "from-sky-500 to-indigo-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500", "from-slate-500 to-slate-700"];

export function Avatar({ name, id, size = "md", blind }: { name: string; id?: string; size?: "sm" | "md" | "lg"; blind?: boolean }) {
  const key = id ?? name;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      className={clsx(
        "inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white",
        blind ? "from-slate-400 to-slate-500" : avatarColors[h % avatarColors.length],
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg",
      )}
    >
      {blind ? "?" : initials(name)}
    </span>
  );
}

/** Dairesel puan göstergesi: dolgu animasyonla gelir, renk puan aralığına göre değişir. */
export function ScoreRing({ score, size = 44, stroke = 4, pending }: { score: number | null; size?: number; stroke?: number; pending?: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score ?? 0));
    return () => cancelAnimationFrame(id);
  }, [score]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} title={score == null ? "Puan bekleniyor" : `${score} / 100`}>
      <svg width={size} height={size} className={clsx("-rotate-90", pending && "animate-spin [animation-duration:2.4s]")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={pending ? "#8b5cf6" : tone.ring}
          strokeDasharray={c}
          strokeDashoffset={pending ? c * 0.75 : c - (c * shown) / 100}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className={clsx("absolute font-bold tabular-nums", size >= 80 ? "text-2xl" : size >= 56 ? "text-base" : "text-xs", pending ? "text-brand-500" : tone.text)}>
        {pending ? "AI" : (score ?? "—")}
      </span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === it.value ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-fuchsia-500 to-orange-400 text-white shadow-lg shadow-brand-500/30">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v16M6 12l9-8M9.5 9.5 17 20" />
        </svg>
      </span>
      <span className={clsx("text-lg", light ? "text-white" : "")}>Kadro</span>
    </span>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("kadro:tema", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} className={clsx("rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white", className)} aria-label="Temayı değiştir">
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}

export function Stat({ label, value, hint, icon, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: "brand" | "emerald" | "amber" | "sky" }) {
  const tones = {
    brand: "from-brand-500/15 to-fuchsia-500/10 text-brand-600 dark:text-brand-300",
    emerald: "from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-300",
    sky: "from-sky-500/15 to-indigo-500/10 text-sky-600 dark:text-sky-300",
  };
  return (
    <div className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={clsx("absolute -top-8 -right-8 size-28 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition group-hover:opacity-100", tones[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={clsx("grid size-10 place-items-center rounded-xl bg-gradient-to-br", tones[tone])}>{icon}</span>
      </div>
    </div>
  );
}
