"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Columns3, Copy, ExternalLink, Pencil, Search, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { toast } from "sonner";
import { Board } from "@/components/Board";
import { RejectDialog } from "@/components/RejectDialog";
import { TalentPoolDialog } from "@/components/TalentPool";
import { Badge, Button, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { jobStatusMeta, STAGES, stageMeta, workTypeLabel } from "@/lib/format";
import type { Card, Job, JobStatus, Stage } from "@/lib/types";

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, can } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRejected, setShowRejected] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pool, setPool] = useState(false);

  const job = useQuery({ queryKey: ["job", id], queryFn: () => api.get<Job>(`/jobs/${id}`) });
  const board = useQuery({ queryKey: ["board", id], queryFn: () => api.get<Card[]>(`/jobs/${id}/applications`) });

  const cards = useMemo(() => {
    const needle = q.toLocaleLowerCase("tr");
    return (board.data ?? []).filter(
      (c) => (!needle || c.candidate.name.toLocaleLowerCase("tr").includes(needle) || c.skills.some((s) => s.toLocaleLowerCase("tr").includes(needle))) && (c.score ?? 0) >= minScore,
    );
  }, [board.data, q, minScore]);

  const toggle = (cid: string) => setSelected((s) => { const n = new Set(s); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });

  const status = useMutation({
    mutationFn: (s: JobStatus) => api.patch<Job>(`/jobs/${id}/status`, { status: s }),
    onSuccess: (j) => {
      qc.setQueryData(["job", id], (old: Job | undefined) => (old ? { ...old, status: j.status } : old));
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(j.status === "OPEN" ? "İlan yayında" : j.status === "CLOSED" ? "İlan başvuruya kapatıldı" : "İlan taslağa alındı");
    },
  });

  const bulk = useMutation({
    mutationFn: (v: { stage: Stage; reason?: string; email?: "rejected" }) => api.post<{ updated: number }>("/applications/bulk", { ids: [...selected], ...v }),
    onSuccess: (r, v) => {
      toast.success(`${r.updated} aday "${stageMeta[v.stage].label}" aşamasına taşındı`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["board", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const careerUrl = me && job.data ? `${location.origin}/kariyer/${me.company.slug}/${job.data.slug}` : "";
  const total = board.data?.length ?? 0;
  const pending = board.data?.filter((c) => c.aiStatus === "PENDING" || c.aiStatus === "PROCESSING").length ?? 0;

  return (
    <>
      <PageHeader
        back={<Link href="/panel/ilanlar" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="size-4" /> İlanlar</Link>}
        title={job.data ? (
          <span className="flex flex-wrap items-center gap-3">
            {job.data.title}
            <Badge className={jobStatusMeta[job.data.status].cls}>{jobStatusMeta[job.data.status].label}</Badge>
          </span>
        ) : <Skeleton className="h-8 w-72" />}
        subtitle={job.data && `${job.data.department} · ${job.data.location} · ${workTypeLabel[job.data.workType]} · ${total} başvuru${pending ? ` · ${pending} CV değerlendiriliyor` : ""}`}
        actions={job.data && (
          <>
            {job.data.status === "OPEN" && (
              <>
                <Button variant="soft" size="sm" icon={<Users className="size-4" />} onClick={() => setPool(true)}>Yetenek havuzu</Button>
                <Button variant="ghost" size="sm" icon={<Copy className="size-4" />} onClick={() => navigator.clipboard.writeText(careerUrl).then(() => toast.success("İlan bağlantısı kopyalandı"))}>Bağlantı</Button>
                <a href={careerUrl} target="_blank"><Button variant="ghost" size="sm" icon={<ExternalLink className="size-4" />}>Önizle</Button></a>
              </>
            )}
            {can("OWNER", "RECRUITER") && (
              <>
                <Link href={`/panel/ilanlar/${id}/duzenle`}><Button variant="secondary" size="sm" icon={<Pencil className="size-4" />}>Düzenle</Button></Link>
                {job.data.status === "OPEN" ? (
                  <Button variant="secondary" size="sm" onClick={() => status.mutate("CLOSED")} loading={status.isPending}>Başvuruya kapat</Button>
                ) : (
                  <Button size="sm" icon={<Sparkles className="size-4" />} onClick={() => status.mutate("OPEN")} loading={status.isPending}>Yayınla</Button>
                )}
              </>
            )}
          </>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder="Ad ya da beceri ile filtrele" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="card flex items-center gap-3 px-3 py-2 text-sm">
          <span className="text-slate-500">Min. puan</span>
          <input type="range" min={0} max={90} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-28 accent-brand-600" />
          <span className="w-6 font-semibold tabular-nums">{minScore}</span>
        </label>
        <p className="ml-auto hidden items-center gap-1.5 text-xs text-slate-400 md:flex"><Columns3 className="size-3.5" /> Kartları sürükleyerek aşama değiştirin</p>
      </div>

      {board.isLoading ? (
        <div className="flex gap-4 overflow-hidden">{STAGES.slice(0, 5).map((s) => <Skeleton key={s} className="h-[480px] w-[290px] shrink-0" />)}</div>
      ) : (
        <Board jobId={id} cards={cards} selected={selected} toggle={toggle} canEdit={can("OWNER", "RECRUITER")} showRejected={showRejected} setShowRejected={setShowRejected} />
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 lg:pl-64">
          <div className="flex animate-pop flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#14141f]/95 p-2 pl-4 text-white shadow-2xl backdrop-blur">
            <span className="text-sm font-medium">{selected.size} aday seçildi</span>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" disabled={selected.size < 2 || selected.size > 4} onClick={() => router.push(`/panel/karsilastir?ids=${[...selected].join(",")}`)} title="2-4 aday seçin">
              Karşılaştır
            </Button>
            {can("OWNER", "RECRUITER") && (
              <>
                <select
                  className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs"
                  value=""
                  onChange={(e) => e.target.value && bulk.mutate({ stage: e.target.value as Stage })}
                  aria-label="Toplu taşı"
                >
                  <option value="">Aşamaya taşı…</option>
                  {STAGES.filter((s) => s !== "REJECTED").map((s) => <option key={s} value={s} className="text-slate-900">{stageMeta[s].label}</option>)}
                </select>
                <Button size="sm" variant="danger" onClick={() => setRejecting(true)}>Ele</Button>
              </>
            )}
            <button onClick={() => setSelected(new Set())} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Seçimi temizle"><X className="size-4" /></button>
          </div>
        </div>
      )}

      <TalentPoolDialog open={pool} onClose={() => setPool(false)} jobId={id} canAdd={can("OWNER", "RECRUITER")} />
      <RejectDialog
        open={rejecting}
        count={selected.size}
        onClose={() => setRejecting(false)}
        onConfirm={(reason, email) => {
          bulk.mutate({ stage: "REJECTED", reason, email: email ? "rejected" : undefined });
          setRejecting(false);
        }}
      />
    </>
  );
}
