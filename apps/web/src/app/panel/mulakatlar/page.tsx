"use client";

import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CalendarClock, CalendarPlus, ClipboardCheck, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Empty, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api, openFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { longDay, time } from "@/lib/format";
import type { Interview } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";

export default function InterviewsPage() {
  const { me } = useAuth();
  const { blind } = useBlind();
  const [scope, setScope] = useState<"all" | "mine">(me?.role === "INTERVIEWER" ? "mine" : "all");
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", scope],
    queryFn: () => api.get<Interview[]>(`/interviews?from=${new Date(Date.now() - 14 * 86400_000).toISOString()}${scope === "mine" ? "&mine=1" : ""}`),
  });

  const groups = new Map<string, Interview[]>();
  for (const iv of data ?? []) {
    const k = new Date(iv.startsAt).toDateString();
    groups.set(k, [...(groups.get(k) ?? []), iv]);
  }
  const today = new Date().toDateString();

  return (
    <>
      <PageHeader title="Mülakatlar" subtitle="Son iki hafta ve yaklaşan görüşmeler." actions={<Tabs value={scope} onChange={setScope} items={[{ value: "all", label: "Tümü" }, { value: "mine", label: "Benimkiler" }]} />} />
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : !groups.size ? (
        <div className="card"><Empty icon={<CalendarClock className="size-6" />} title="Mülakat yok" text="Aday profilinden mülakat planladığınızda burada görünür." /></div>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([day, items]) => {
            const past = new Date(day).getTime() < new Date(today).getTime();
            return (
              <section key={day} className="animate-fade-up">
                <h2 className={clsx("mb-3 flex items-center gap-2 text-sm font-semibold", past ? "text-slate-400" : "")}>
                  {day === today && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] text-white">Bugün</span>}
                  {longDay(items[0].startsAt)}
                </h2>
                <div className="stagger grid gap-3 lg:grid-cols-2">
                  {items.map((iv) => {
                    const a = iv.application!;
                    const isPast = new Date(iv.startsAt).getTime() < Date.now();
                    const mineMissing = isPast && iv.panelists.some((p) => p.user.id === me?.user.id) && !iv.scorecards.some((s) => s.author.id === me?.user.id);
                    return (
                      <div key={iv.id} className={clsx("card flex gap-4 p-4", iv.cancelledAt && "opacity-50", isPast && "bg-slate-50/50 dark:bg-white/[0.015]")}>
                        <div className="w-16 shrink-0 border-r border-slate-100 pr-4 text-center dark:border-white/5">
                          <p className="text-lg font-semibold tabular-nums">{time(iv.startsAt)}</p>
                          <p className="text-xs text-slate-500">{iv.durationMin} dk</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/panel/basvurular/${a.id}`} className="font-medium hover:text-brand-600">{blind ? "Gizli aday" : a.candidate.name}</Link>
                          <p className="truncate text-sm text-slate-500">{iv.title} · {a.job.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500"><Video className="size-3.5" />{iv.location}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex -space-x-2">{iv.panelists.map((p) => <span key={p.user.id} title={p.user.name}><Avatar name={p.user.name} id={p.user.id} size="sm" /></span>)}</div>
                            {iv.scorecards.length > 0 && <span className="text-xs text-slate-500">{iv.scorecards.length} değerlendirme</span>}
                            {mineMissing && <Link href={`/panel/basvurular/${a.id}`} className="ml-auto flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><ClipboardCheck className="size-3.5" />Formunu doldur</Link>}
                          </div>
                        </div>
                        {!isPast && !iv.cancelledAt && (
                          <button onClick={() => openFile(`/interviews/${iv.id}/ics`, "mulakat.ics")} className="self-start rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10" title="Takvime ekle"><CalendarPlus className="size-4" /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
