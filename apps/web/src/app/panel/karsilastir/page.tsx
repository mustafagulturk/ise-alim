"use client";

import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ArrowLeft, Check, Minus, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Avatar, PageHeader, ScoreRing, Skeleton, StageBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { Analysis, Card, Requirement, Verdict } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";

type Row = Card & { analysis: Analysis | null; job: { id: string; title: string; requirements: (Requirement & { id: string })[] } };

const CELL: Record<Verdict, { icon: typeof Check; cls: string }> = {
  met: { icon: Check, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  partial: { icon: Minus, cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  missing: { icon: X, cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
};

function Compare() {
  const ids = useSearchParams().get("ids") ?? "";
  const { name, blind } = useBlind();
  const { data, isLoading } = useQuery({ queryKey: ["compare", ids], queryFn: () => api.get<Row[]>(`/applications/compare?ids=${ids}`) });
  if (isLoading || !data) return <Skeleton className="h-96" />;
  const reqs = data[0]?.job.requirements ?? [];
  const best = Math.max(...data.map((d) => d.score ?? 0));
  const sameJob = data.every((d) => d.job.id === data[0]?.job.id);

  return (
    <>
      <PageHeader
        back={data[0] && <Link href={`/panel/ilanlar/${data[0].job.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Aday hattı</Link>}
        title="Aday karşılaştırma"
        subtitle={sameJob ? data[0]?.job.title : "Farklı ilanlardaki adaylar: kriterler ilk adayın ilanına göre gösterilir."}
      />
      <div className="card overflow-x-auto animate-fade-up">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="w-[32%] p-5 text-left align-bottom text-xs font-medium text-slate-500">Kriter</th>
              {data.map((d) => (
                <th key={d.id} className="p-5 text-center align-bottom">
                  <Link href={`/panel/basvurular/${d.id}`} className="group inline-flex flex-col items-center gap-2">
                    <div className="relative">
                      <Avatar name={d.candidate.name} id={d.candidate.id} size="lg" blind={blind} />
                      {d.score === best && best > 0 && <Trophy className="absolute -top-2 -right-2 size-6 rounded-full bg-amber-400 p-1 text-white shadow" />}
                    </div>
                    <span className="font-semibold group-hover:text-brand-600">{name(d.candidate)}</span>
                    <StageBadge stage={d.stage} />
                    <ScoreRing score={d.score} size={56} stroke={5} />
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {reqs.map((r) => (
              <tr key={r.id}>
                <td className="p-4 pl-5">
                  <p className="font-medium">{r.text}</p>
                  <p className="text-xs text-slate-400">Ağırlık {r.weight}/5{r.mustHave ? " · Zorunlu" : ""}</p>
                </td>
                {data.map((d) => {
                  const a = d.analysis?.requirements.find((x) => x.id === r.id);
                  if (!a) return <td key={d.id} className="p-4 text-center text-slate-300">—</td>;
                  const c = CELL[a.verdict];
                  const Icon = c.icon;
                  return (
                    <td key={d.id} className="p-4 text-center" title={a.evidence}>
                      <span className={clsx("inline-grid size-8 place-items-center rounded-full", c.cls)}><Icon className="size-4" /></span>
                      <p className="mx-auto mt-1.5 line-clamp-2 max-w-48 text-xs text-slate-500">{a.evidence.replace(/^"|"$/g, "")}</p>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
              <td className="p-4 pl-5 font-medium">Deneyim</td>
              {data.map((d) => <td key={d.id} className="p-4 text-center font-semibold">{d.analysis?.experienceYears != null ? `${d.analysis.experienceYears} yıl` : "—"}</td>)}
            </tr>
            <tr>
              <td className="p-4 pl-5 align-top font-medium">Güçlü yanlar</td>
              {data.map((d) => <td key={d.id} className="p-4 align-top text-xs text-slate-600 dark:text-slate-300"><ul className="space-y-1 text-left">{d.analysis?.strengths.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}</ul></td>)}
            </tr>
            <tr>
              <td className="p-4 pl-5 align-top font-medium">Riskler</td>
              {data.map((d) => <td key={d.id} className="p-4 align-top text-xs text-slate-600 dark:text-slate-300"><ul className="space-y-1 text-left">{d.analysis?.concerns.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}</ul></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ComparePage() {
  return <Suspense><Compare /></Suspense>;
}
