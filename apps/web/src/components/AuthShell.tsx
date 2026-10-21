import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, ScoreRing } from "./ui";

/** Giriş/kayıt sayfalarının ortak iki kolonlu düzeni: solda form, sağda ürün tanıtımı. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 animate-fade-up">{children}</div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Kadro · Demo amaçlı açık kaynak proje</p>
      </div>
      <div className="relative hidden overflow-hidden bg-[#0f0f1a] lg:block">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="absolute -top-32 -left-20 size-[480px] rounded-full bg-brand-600/40 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 size-[420px] rounded-full bg-fuchsia-500/30 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-brand-200">
            <Sparkles className="size-3.5" /> Claude ile CV değerlendirme
          </span>
          <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
            Yüzlerce CV'yi okumak yerine <span className="text-gradient">en iyi adaylarla</span> konuşun.
          </h2>
          <p className="mt-4 max-w-md text-slate-400">Her başvuru, ilanınızdaki kriterlere göre kanıtlarıyla puanlanır. Ekibiniz kanban üzerinde birlikte karar verir.</p>

          <div className="relative mt-12 h-64">
            <div className="absolute top-0 left-0 w-72 animate-float rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold">ZY</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Zeynep Yıldız</p>
                  <p className="text-xs text-slate-400">Backend Geliştirici · 7 yıl</p>
                </div>
                <ScoreRing score={92} size={44} />
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <p className="flex items-center gap-2 text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" /> Node.js ve TypeScript: "günde 2M isteği karşılayan API…"</p>
                <p className="flex items-center gap-2 text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" /> PostgreSQL: "sorguları 1,8 sn'den 120 ms'ye…"</p>
                <p className="flex items-center gap-2 text-amber-300"><span className="size-1.5 rounded-full bg-amber-400" /> Kubernetes: kısmen</p>
              </div>
            </div>
            <div className="absolute top-28 left-64 w-60 animate-float rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl [animation-delay:-3s]">
              <p className="text-xs text-slate-400">Bu hafta</p>
              <p className="mt-1 text-2xl font-semibold">128 başvuru</p>
              <div className="mt-3 flex h-12 items-end gap-1">
                {[30, 45, 35, 60, 50, 80, 70].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-600 to-fuchsia-400" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
