"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CalendarClock, Clock, Inbox, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Empty, PageHeader, ScoreRing, Skeleton, StageBadge, Stat } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, relative, stageMeta } from "@/lib/format";
import type { Analytics, Card, Interview, JobListItem, Paged } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

export default function Dashboard() {
  const { me } = useAuth();
  const { name, blind } = useBlind();
  const stats = useQuery({ queryKey: ["analytics", "all"], queryFn: () => api.get<Analytics>("/analytics") });
  const review = useQuery({
    queryKey: ["applications", "review"],
    queryFn: () => api.get<Paged<Card & { job: { id: string; title: string } }>>("/applications?stage=APPLIED&sort=score"),
  });
  const interviews = useQuery({ queryKey: ["interviews", "upcoming"], queryFn: () => api.get<Interview[]>(`/interviews?from=${new Date().toISOString()}`) });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api.get<JobListItem[]>("/jobs") });

  const t = stats.data?.totals;
  const maxFunnel = stats.data?.funnel[0]?.count || 1;

  return (
    <>
      <PageHeader
        title={<>{greeting()}, {me?.user.name.split(" ")[0]} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span></>}
        subtitle="İşe alım süreçlerinin bugünkü özeti."
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <Stat label="Toplam başvuru" value={t?.applications ?? 0} hint={`Son 7 günde ${t?.last7 ?? 0} yeni`} icon={<Users className="size-5" />} />
            <Stat label="Yayındaki ilan" value={t?.openJobs ?? 0} hint={`${jobs.data?.reduce((s, j) => s + j.newToday, 0) ?? 0} başvuru bugün geldi`} icon={<Briefcase className="size-5" />} tone="sky" />
            <Stat label="Yaklaşan mülakat" value={t?.upcomingInterviews ?? 0} hint="Takvime eklenmiş" icon={<CalendarClock className="size-5" />} tone="amber" />
            <Stat label="Ort. işe alım süresi" value={t?.avgTimeToHire != null ? `${t.avgTimeToHire} gün` : "—"} hint={`${t?.hired ?? 0} kişi işe alındı`} icon={<Clock className="size-5" />} tone="emerald" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card animate-fade-up overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand-500" /> İncelemeni bekleyenler</h2>
              <p className="text-xs text-slate-500">Yeni başvurular, yapay zekâ puanına göre sıralı</p>
            </div>
            <Link href="/panel/adaylar?stage=APPLIED&sort=score" className="text-sm font-medium text-brand-600 hover:underline">Tümü</Link>
          </div>
          {review.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !review.data?.items.length ? (
            <Empty icon={<Inbox className="size-6" />} title="Bekleyen başvuru yok" text="Yeni başvurular geldiğinde burada puanlarıyla listelenir." />
          ) : (
            <ul className="stagger divide-y divide-slate-100 dark:divide-white/5">
              {review.data.items.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link href={`/panel/basvurular/${a.id}`} className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <Avatar name={a.candidate.name} id={a.candidate.id} blind={blind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name(a.candidate)}</p>
                      <p className="truncate text-xs text-slate-500">{a.job.title} · {relative(a.createdAt)}</p>
                    </div>
                    <div className="hidden gap-1 md:flex">
                      {a.skills.map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{s}</span>)}
                    </div>
                    <ScoreRing score={a.score} pending={a.aiStatus !== "DONE"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card animate-fade-up p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Yaklaşan mülakatlar</h2>
              <Link href="/panel/mulakatlar" className="text-sm font-medium text-brand-600 hover:underline">Takvim</Link>
            </div>
            {interviews.isLoading ? (
              <Skeleton className="h-24" />
            ) : !interviews.data?.filter((i) => !i.cancelledAt).length ? (
              <p className="py-6 text-center text-sm text-slate-500">Planlanmış mülakat yok.</p>
            ) : (
              <ul className="space-y-3">
                {interviews.data.filter((i) => !i.cancelledAt).slice(0, 4).map((i) => (
                  <li key={i.id}>
                    <Link href={`/panel/basvurular/${i.application!.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-amber-50 py-1.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        <span className="text-[10px] font-semibold uppercase">{new Date(i.startsAt).toLocaleDateString("tr-TR", { month: "short" })}</span>
                        <span className="text-lg leading-none font-bold">{new Date(i.startsAt).getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{blind ? "Gizli aday" : i.application!.candidate.name}</p>
                        <p className="truncate text-xs text-slate-500">{i.title} · {dateTime(i.startsAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card animate-fade-up p-5">
            <h2 className="mb-4 font-semibold">İşe alım hunisi</h2>
            <div className="space-y-2.5">
              {stats.data?.funnel.map((f) => (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">{stageMeta[f.stage].label}</span>
                    <span className="font-semibold tabular-nums">{f.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div className={`h-full rounded-full ${stageMeta[f.stage].dot} transition-all duration-1000`} style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="mt-6 animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Aktif ilanlar</h2>
          <Link href="/panel/ilanlar" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Tüm ilanlar <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.data?.filter((j) => j.status === "OPEN").slice(0, 3).map((j) => (
            <Link key={j.id} href={`/panel/ilanlar/${j.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-xs text-slate-500">{j.department}</p>
              <p className="mt-1 font-semibold group-hover:text-brand-600">{j.title}</p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                {(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const).map((s) => (
                  <div key={s} className={stageMeta[s].dot} style={{ width: `${((j.stages[s] ?? 0) / (j.applicationCount || 1)) * 100}%` }} />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{j.applicationCount} başvuru {j.newToday > 0 && <b className="text-brand-600">· {j.newToday} yeni</b>}</span>
                {j.stages.INTERVIEW ? <StageBadge stage="INTERVIEW" /> : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
