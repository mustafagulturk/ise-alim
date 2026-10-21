"use client";

import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Empty, PageHeader, ScoreRing, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { jobStatusMeta, relative, stageMeta, workTypeLabel } from "@/lib/format";
import type { JobListItem, JobStatus } from "@/lib/types";

const ORDER: Record<JobStatus, number> = { OPEN: 0, DRAFT: 1, CLOSED: 2 };

export default function JobsPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const { data, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => api.get<JobListItem[]>("/jobs") });
  const jobs = (data ?? []).filter((j) => filter === "all" || j.status === filter).sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <>
      <PageHeader
        title="İlanlar"
        subtitle="Her ilanın kendi değerlendirme kriterleri ve aday hattı var."
        actions={can("OWNER", "RECRUITER") && (
          <Link href="/panel/ilanlar/yeni"><Button icon={<Plus className="size-4" />}>Yeni ilan</Button></Link>
        )}
      />
      <div className="mb-5">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: `Tümü ${data ? `(${data.length})` : ""}` },
            { value: "OPEN", label: "Yayında" },
            { value: "DRAFT", label: "Taslak" },
            { value: "CLOSED", label: "Kapandı" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : !jobs.length ? (
        <div className="card">
          <Empty icon={<Briefcase className="size-6" />} title="Bu filtrede ilan yok" text="Yeni bir ilan oluşturup kriterlerini belirleyin; başvurular otomatik puanlansın." action={can("OWNER", "RECRUITER") && <Link href="/panel/ilanlar/yeni"><Button icon={<Plus className="size-4" />}>Yeni ilan</Button></Link>} />
        </div>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2">
          {jobs.map((j) => (
            <Link key={j.id} href={`/panel/ilanlar/${j.id}`} className={clsx("card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-xl", j.status !== "OPEN" && "opacity-80")}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-fuchsia-500 to-orange-400 opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={jobStatusMeta[j.status].cls}>{jobStatusMeta[j.status].label}</Badge>
                    {j.newToday > 0 && <Badge className="bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">+{j.newToday} bugün</Badge>}
                  </div>
                  <h3 className="truncate text-lg font-semibold group-hover:text-brand-600">{j.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span>{j.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="size-3.5" />{j.location} · {workTypeLabel[j.workType]}</span>
                  </p>
                </div>
                <div className="text-center">
                  <ScoreRing score={j.avgScore} size={52} />
                  <p className="mt-1 text-[10px] text-slate-400">ort. puan</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                {(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const).map((s) => (
                  <div key={s} className="rounded-xl bg-slate-50 px-2 py-2 text-center dark:bg-white/[0.03]">
                    <p className="text-lg font-semibold tabular-nums">{j.stages[s] ?? 0}</p>
                    <p className="flex items-center justify-center gap-1 truncate text-[10px] text-slate-500"><span className={`size-1.5 shrink-0 rounded-full ${stageMeta[s].dot}`} />{stageMeta[s].label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="size-3.5" /> {j.applicationCount} başvuru</span>
                <span>{j.publishedAt ? `Yayın: ${relative(j.publishedAt)}` : `Oluşturuldu: ${relative(j.createdAt)}`}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
