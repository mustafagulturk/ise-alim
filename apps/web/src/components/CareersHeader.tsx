import Link from "next/link";

export function CareersHeader({ name, slug, color }: { name: string; slug: string; color: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0b0b12]/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href={`/kariyer/${slug}`} className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg text-sm text-white" style={{ background: color }}>{name[0]}</span>
          {name}
        </Link>
        <span className="text-xs text-slate-400">Kadro ile güçlendirildi</span>
      </div>
    </header>
  );
}
