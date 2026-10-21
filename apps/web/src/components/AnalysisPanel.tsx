"use client";

import { clsx } from "clsx";
import { AlertTriangle, Bot, Check, CheckCircle2, Copy, Cpu, Lightbulb, Minus, ShieldAlert, Sparkles, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { scoreTone } from "@/lib/format";
import type { AiStatus, Analysis, Verdict } from "@/lib/types";
import { Badge, ScoreRing, Skeleton } from "./ui";

const VERDICT: Record<Verdict, { icon: typeof Check; cls: string; label: string; points: number }> = {
  met: { icon: Check, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", label: "Karşılıyor", points: 1 },
  partial: { icon: Minus, cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Kısmen", points: 0.5 },
  missing: { icon: X, cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", label: "Kanıt yok", points: 0 },
};

export function AnalysisPanel({ analysis, status, error }: { analysis: Analysis | null; status: AiStatus; error: string | null }) {
  if (status === "PENDING" || status === "PROCESSING" || (!analysis && status !== "FAILED")) {
    return (
      <div className="card relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-fuchsia-500/5" />
        <div className="relative flex items-center gap-4">
          <ScoreRing score={null} size={72} stroke={6} pending />
          <div>
            <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 animate-pulse text-brand-500" /> CV değerlendiriliyor…</p>
            <p className="text-sm text-slate-500">Metin çıkarılıyor, kişisel veriler maskeleniyor ve her kriter için kanıt aranıyor.</p>
          </div>
        </div>
        <div className="relative mt-6 space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      </div>
    );
  }
  if (!analysis) {
    return (
      <div className="card flex items-center gap-3 border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertTriangle className="size-5 shrink-0" />
        <div><b>CV değerlendirilemedi.</b> {error ? `(${error.slice(0, 160)})` : ""} Dosyayı açıp elle inceleyebilir ya da yeniden puanlatabilirsiniz.</div>
      </div>
    );
  }

  const tone = scoreTone(analysis.score);
  const totalWeight = analysis.requirements.reduce((s, r) => s + r.weight, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full blur-3xl" style={{ background: `${tone.ring}22` }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center">
            <ScoreRing score={analysis.score} size={104} stroke={8} />
            <span className={clsx("mt-2 text-xs font-semibold", tone.text)}>{tone.label} eşleşme</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={analysis.provider === "claude" ? "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20" : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"}>
                {analysis.provider === "claude" ? <Bot className="size-3" /> : <Cpu className="size-3" />}
                {analysis.provider === "claude" ? `Claude (${analysis.model ?? "claude"})` : "Yerel puanlayıcı"}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" >
                <ShieldAlert className="size-3" /> Kişisel veriler maskelendi
              </Badge>
              {analysis.experienceYears != null && <Badge className="bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">≈ {analysis.experienceYears} yıl deneyim</Badge>}
            </div>
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">{analysis.summary}</p>
            {analysis.mustHaveMissing.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>Zorunlu kriter eksik: <b>{analysis.mustHaveMissing.join(", ")}</b>. Puan en fazla 35 olarak sınırlandı.</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <h3 className="font-semibold">Kriter bazında değerlendirme</h3>
          <span className="text-xs text-slate-500">Puan = ağırlıklı ortalama</span>
        </div>
        <ul className="stagger divide-y divide-slate-100 dark:divide-white/5">
          {analysis.requirements.map((r) => {
            const v = VERDICT[r.verdict];
            const Icon = v.icon;
            const contribution = Math.round(((r.weight * v.points) / totalWeight) * 100);
            const max = Math.round((r.weight / totalWeight) * 100);
            return (
              <li key={r.id} className="flex gap-4 px-5 py-4">
                <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full", v.cls)} title={v.label}><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.text}</p>
                    {r.mustHave && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 uppercase dark:bg-rose-500/15 dark:text-rose-300">Zorunlu</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 italic dark:text-slate-400">{r.evidence}</p>
                </div>
                <div className="w-20 shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">+{contribution}<span className="text-slate-400">/{max}</span></p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500" style={{ width: `${max ? (contribution / max) * 100 : 0}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><ThumbsUp className="size-4 text-emerald-500" /> Güçlü yanlar</h3>
          <ul className="space-y-2 text-sm">
            {analysis.strengths.length ? analysis.strengths.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />{s}</li>) : <li className="text-slate-500">Belirgin bir güçlü yan bulunamadı.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber-500" /> Dikkat edilmesi gerekenler</h3>
          <ul className="space-y-2 text-sm">
            {analysis.concerns.length ? analysis.concerns.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />{s}</li>) : <li className="text-slate-500">Önemli bir risk görünmüyor.</li>}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-brand-500" /> Önerilen mülakat soruları</h3>
          <button
            onClick={() => navigator.clipboard.writeText(analysis.interviewQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")).then(() => toast.success("Sorular kopyalandı"))}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            <Copy className="size-3.5" /> Kopyala
          </button>
        </div>
        <ol className="space-y-2.5 text-sm">
          {analysis.interviewQuestions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{i + 1}</span>
              <span className="pt-0.5">{q}</span>
            </li>
          ))}
        </ol>
        {analysis.skills.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/5">
            <p className="mb-2 text-xs font-medium text-slate-500">CV'de geçen beceriler</p>
            <div className="flex flex-wrap gap-1.5">{analysis.skills.map((s) => <span key={s} className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-white/5">{s}</span>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
