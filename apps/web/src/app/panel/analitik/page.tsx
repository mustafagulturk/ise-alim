"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Clock, Target, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Skeleton, Stat, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { stageMeta } from "@/lib/format";
import type { Analytics, JobListItem } from "@/lib/types";

// Tüm grafikler tek seri: kimlik rengi yerine tek marka tonu kullanılır, renk yalnızca vurgu taşır.
const BRAND = "#7c3aed";
const axis = { fontSize: 11, fill: "#94a3b8" };

function ChartTip({ active, payload, label, unit = "başvuru" }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#17172a]">
      <p className="text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{payload[0].value} {unit}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 animate-fade-up">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [jobId, setJobId] = useState("");
  const [days, setDays] = useState<"30" | "60" | "90">("30");
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api.get<JobListItem[]>("/jobs") });
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", jobId, days],
    queryFn: () => api.get<Analytics>(`/analytics?days=${days}${jobId ? `&jobId=${jobId}` : ""}`),
  });

  const daily = data?.daily.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) }));
  const funnel = data?.funnel.map((f, i, arr) => ({
    name: stageMeta[f.stage].label,
    count: f.count,
    rate: i === 0 || !arr[i - 1].count ? null : Math.round((f.count / arr[i - 1].count) * 100),
  }));
  const conv = data && data.funnel[0].count ? Math.round((data.funnel[4].count / data.funnel[0].count) * 1000) / 10 : 0;
  const ai = data?.providers.reduce((s, p) => s + p.count, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Analitik"
        subtitle="Başvuru akışı, huni dönüşümleri ve kaynak performansı."
        actions={
          <>
            <select className="field h-10 w-auto" value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="İlan">
              <option value="">Tüm ilanlar</option>
              {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <Tabs value={days} onChange={setDays} items={[{ value: "30", label: "30 gün" }, { value: "60", label: "60 gün" }, { value: "90", label: "90 gün" }]} />
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className={i < 4 ? "h-32" : "h-72 md:col-span-2"} />)}</div>
      ) : (
        <>
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Başvuru" value={data.totals.applications} hint={`Son 7 gün: ${data.totals.last7}`} icon={<Users className="size-5" />} />
            <Stat label="Başvurudan işe alıma" value={`%${conv}`} hint={`${data.totals.hired} işe alım`} icon={<Target className="size-5" />} tone="emerald" />
            <Stat label="Ort. işe alım süresi" value={data.totals.avgTimeToHire != null ? `${data.totals.avgTimeToHire} gün` : "—"} hint="Başvurudan işe alıma" icon={<Clock className="size-5" />} tone="amber" />
            <Stat label="Yapay zekâ ile değerlendirilen" value={ai} hint={data.providers.map((p) => `${p.provider === "claude" ? "Claude" : "Yerel"}: ${p.count}`).join(" · ") || "—"} icon={<Bot className="size-5" />} tone="sky" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Günlük başvurular" subtitle={`Son ${days} gün`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }} />
                  <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="İşe alım hunisi" subtitle="Her aşamaya ulaşan başvuru sayısı ve bir önceki aşamadan geçiş oranı">
              <div className="space-y-3">
                {funnel?.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm text-slate-600 dark:text-slate-300">{f.name}</span>
                    <div className="h-9 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                      <div
                        className="flex h-full items-center rounded-lg px-3 text-xs font-semibold text-white transition-all duration-1000"
                        style={{ width: `${Math.max(6, (f.count / (funnel[0].count || 1)) * 100)}%`, background: BRAND, opacity: 1 - i * 0.14 }}
                      >
                        {f.count}
                      </div>
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs text-slate-500 tabular-nums">{f.rate != null ? `%${f.rate}` : ""}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Başvuru kaynakları" subtitle="Adaylar bizi nereden buluyor?">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.sources} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
                  <CartesianGrid horizontal={false} stroke="#94a3b8" strokeOpacity={0.15} />
                  <XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="source" tick={{ ...axis, fill: "#64748b" }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }} />
                  <Bar dataKey="count" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Puan dağılımı" subtitle="Yapay zekâ eşleşme puanları">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.scores} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip unit="aday" />} cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }} />
                  <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><TrendingUp className="size-3.5" /> 75 ve üzeri puan "güçlü eşleşme" sayılır.</p>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
