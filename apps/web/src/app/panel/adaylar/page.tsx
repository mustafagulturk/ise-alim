"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Avatar, Empty, PageHeader, ScoreRing, Skeleton, StageBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { STAGES, relative, stageMeta } from "@/lib/format";
import type { Card, JobListItem, Paged } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";

type Row = Card & { job: { id: string; title: string }; headline: string | null };

/** Sunucudan gelen ⟦vurgu⟧ işaretlerini güvenli şekilde <mark> öğesine çevirir. */
function Highlight({ text }: { text: string }) {
  return <>{text.split(/(⟦[^⟧]*⟧)/).map((part, i) => (part.startsWith("⟦") ? <mark key={i}>{part.slice(1, -1)}</mark> : part))}</>;
}

const EXAMPLES = ["kubernetes", "react native", "e-fatura", "mentorluk", "figma"];

function Candidates() {
  const router = useRouter();
  const params = useSearchParams();
  const { name, blind } = useBlind();
  const [q, setQ] = useState(params.get("q") ?? "");
  const query = Object.fromEntries(params.entries());

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update({ q: q || undefined, page: undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function update(patch: Record<string, string | undefined>) {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    router.replace(`/panel/adaylar?${n.toString()}`);
  }

  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api.get<JobListItem[]>("/jobs") });
  const list = useQuery({
    queryKey: ["applications", "list", query],
    queryFn: () => api.get<Paged<Row>>(`/applications?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const page = Number(params.get("page") ?? 1);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Adaylar" subtitle="Tüm ilanlardaki başvurular. Arama CV içeriğinde Türkçe kök eşleştirmesiyle yapılır." />

      <div className="card mb-4 p-4 animate-fade-up">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
          <input
            className="field h-12 pl-12 text-base"
            placeholder='CV içinde ara: "kubernetes", "takım lideri", "e-fatura"…'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Örnek:</span>
          {EXAMPLES.map((e) => <button key={e} onClick={() => setQ(e)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs transition hover:bg-brand-50 hover:text-brand-700 dark:bg-white/5">{e}</button>)}
          <div className="ml-auto flex flex-wrap gap-2">
            <select className="field h-9 w-auto py-1" value={params.get("jobId") ?? ""} onChange={(e) => update({ jobId: e.target.value || undefined, page: undefined })} aria-label="İlan">
              <option value="">Tüm ilanlar</option>
              {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <select className="field h-9 w-auto py-1" value={params.get("stage") ?? ""} onChange={(e) => update({ stage: e.target.value || undefined, page: undefined })} aria-label="Aşama">
              <option value="">Tüm aşamalar</option>
              {STAGES.map((s) => <option key={s} value={s}>{stageMeta[s].label}</option>)}
            </select>
            <select className="field h-9 w-auto py-1" value={params.get("sort") ?? "recent"} onChange={(e) => update({ sort: e.target.value })} aria-label="Sıralama">
              <option value="recent">En yeni</option>
              <option value="score">En yüksek puan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {list.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !list.data?.items.length ? (
          <Empty icon={<Users className="size-6" />} title="Sonuç bulunamadı" text={q ? `"${q}" ifadesi hiçbir CV'de geçmiyor. Farklı bir kelime deneyin.` : "Filtrelere uyan başvuru yok."} />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500 dark:border-white/5">
              <span><b className="text-slate-900 dark:text-white">{list.data.total}</b> başvuru {q && <>· <Sparkles className="inline size-3.5 text-brand-500" /> "{q}" için</>}</span>
              {list.isFetching && <span className="text-xs">Güncelleniyor…</span>}
            </div>
            <ul className={clsx("divide-y divide-slate-100 transition-opacity dark:divide-white/5", list.isFetching && "opacity-60")}>
              {list.data.items.map((a) => (
                <li key={a.id}>
                  <Link href={`/panel/basvurular/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <Avatar name={a.candidate.name} id={a.candidate.id} blind={blind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{name(a.candidate)}</p>
                        <StageBadge stage={a.stage} />
                      </div>
                      <p className="truncate text-xs text-slate-500">{a.job.title} · {a.source} · {relative(a.createdAt)}</p>
                      {a.headline && <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">…<Highlight text={a.headline} />…</p>}
                    </div>
                    <div className="hidden gap-1 lg:flex">{a.skills.map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/5">{s}</span>)}</div>
                    <ScoreRing score={a.score} pending={a.aiStatus !== "DONE"} />
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm dark:border-white/5">
                <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="size-4" />Önceki</button>
                <span className="text-slate-500">{page} / {pages}</span>
                <button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} className="flex items-center gap-1 disabled:opacity-40">Sonraki<ChevronRight className="size-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function CandidatesPage() {
  return <Suspense><Candidates /></Suspense>;
}
