"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Medal, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { stageMeta } from "@/lib/format";
import type { JobMatches, PoolMatch } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";
import { Avatar, Badge, Button, Empty, Modal, ScoreRing, Skeleton } from "./ui";

function useAdd(onAdded: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { jobId: string; candidateId: string }) => api.post<{ id: string }>(`/jobs/${v.jobId}/talent-pool/${v.candidateId}`),
    onSuccess: (_r, v) => {
      toast.success("Aday hatta eklendi", { description: "CV bu ilana göre yeniden değerlendiriliyor, adaya bilgilendirme e-postası gitti." });
      qc.invalidateQueries({ queryKey: ["board", v.jobId] });
      qc.invalidateQueries({ queryKey: ["talent-pool", v.jobId] });
      onAdded();
    },
    onError: (e) => toast.error(e.message),
  });
}

function PoolRow({ m, jobId, canAdd }: { m: PoolMatch; jobId: string; canAdd: boolean }) {
  const { name, blind } = useBlind();
  const [added, setAdded] = useState(false);
  const add = useAdd(() => setAdded(true));
  const last = m.previous[0];
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-200 hover:shadow-sm sm:flex-row sm:items-center dark:border-white/10">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar name={m.candidate.name} id={m.candidate.id} blind={blind} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/panel/basvurular/${last.id}`} className="font-medium hover:text-brand-600">{name(m.candidate)}</Link>
            {m.silverMedalist && (
              <Badge className="bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"><Medal className="size-3" /> Mülakata kalmıştı</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Önceki: {last.job.title} · {stageMeta[last.maxStage].label} aşamasına kadar{last.score != null && ` · ${last.score} puan`}
            {m.experienceYears != null && ` · ≈ ${m.experienceYears} yıl`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.highlights.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Check className="size-3" />{h}</span>
            ))}
          </div>
          {m.mustHaveMissing.length > 0 && <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600"><AlertTriangle className="size-3" /> Zorunlu eksik: {m.mustHaveMissing.join(", ")}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{m.met}/{m.total} kriter</span>
          <ScoreRing score={m.score} size={44} />
        </div>
        {canAdd && (added ? (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600"><Check className="size-4" /> Eklendi</span>
        ) : (
          <Button size="sm" variant="soft" icon={<UserPlus className="size-4" />} loading={add.isPending} onClick={() => add.mutate({ jobId, candidateId: m.candidate.id })}>Hatta ekle</Button>
        ))}
      </div>
    </li>
  );
}

/** İlan sayfasından açılır: daha önce başka ilanlara başvurmuş, onay vermiş ve bu ilana uyan adaylar. */
export function TalentPoolDialog({ open, onClose, jobId, canAdd }: { open: boolean; onClose: () => void; jobId: string; canAdd: boolean }) {
  const pool = useQuery({ queryKey: ["talent-pool", jobId], queryFn: () => api.get<PoolMatch[]>(`/jobs/${jobId}/talent-pool`), enabled: open });
  return (
    <Modal open={open} onClose={onClose} title="Yetenek havuzu" wide>
      <p className="-mt-2 mb-4 flex items-start gap-2 text-sm text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        Başka ilanlara başvurmuş ve diğer pozisyonlar için değerlendirilmeye onay vermiş adaylar bu ilanın kriterlerine göre puanlandı. Mülakata kadar gelmiş adaylar üstte.
      </p>
      {pool.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !pool.data?.length ? (
        <Empty icon={<Users className="size-6" />} title="Uygun aday bulunamadı" text="Havuzda bu ilana en az 50 puanla uyan aday yok. Yeni başvurular geldikçe liste dolacak." />
      ) : (
        <ul className="stagger max-h-[62vh] space-y-2 overflow-y-auto pr-1">
          {pool.data.map((m) => <PoolRow key={m.candidate.id} m={m} jobId={jobId} canAdd={canAdd} />)}
        </ul>
      )}
    </Modal>
  );
}

/** Aday profilinde: başvurmadığı diğer açık ilanlara uygunluğu. */
export function OtherJobMatches({ applicationId, canAdd }: { applicationId: string; canAdd: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["matches", applicationId], queryFn: () => api.get<JobMatches>(`/applications/${applicationId}/matches`) });
  const add = useAdd(() => {
    qc.invalidateQueries({ queryKey: ["matches", applicationId] });
    qc.invalidateQueries({ queryKey: ["application", applicationId] });
  });
  if (!q.data?.matches.length) return null;
  return (
    <div className="card p-5">
      <h3 className="font-semibold">Diğer açık ilanlara uygunluk</h3>
      <p className="mt-0.5 mb-3 text-xs text-slate-500">{q.data.consent ? "Aday diğer pozisyonlar için değerlendirilmeye onay verdi." : "Aday havuz onayı vermediği için başka ilana eklenemez."}</p>
      <ul className="space-y-2">
        {q.data.matches.map((m) => (
          <li key={m.job.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-white/5">
            <ScoreRing score={m.score} size={36} stroke={3} />
            <div className="min-w-0 flex-1">
              <Link href={`/panel/ilanlar/${m.job.id}`} className="block truncate text-sm font-medium hover:text-brand-600">{m.job.title}</Link>
              <p className="text-xs text-slate-500">{m.met}/{m.total} kriter{m.mustHaveMissing.length ? " · zorunlu eksik" : ""}</p>
            </div>
            {canAdd && q.data.consent && m.score >= 50 && (
              <Button size="sm" variant="ghost" icon={<UserPlus className="size-4" />} loading={add.isPending && add.variables?.jobId === m.job.id} onClick={() => add.mutate({ jobId: m.job.id, candidateId: q.data!.candidateId })}>Ekle</Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
