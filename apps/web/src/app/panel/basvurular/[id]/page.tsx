"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ArrowLeft, CalendarClock, CalendarDays, CalendarPlus, ClipboardCheck, Download, FileText, Link2, ListChecks, Mail, MapPin, Phone, RefreshCw, Send, ThumbsDown, ThumbsUp, Video } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { EmailDialog } from "@/components/EmailDialog";
import { InterviewDialog } from "@/components/InterviewDialog";
import { KitDialog } from "@/components/KitDialog";
import { RejectDialog } from "@/components/RejectDialog";
import { ScorecardDialog } from "@/components/ScorecardDialog";
import { Timeline } from "@/components/Timeline";
import { Avatar, Button, Skeleton, StageBadge, Tabs } from "@/components/ui";
import { api, fileUrl, openFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STAGES, date, dateTime, longDay, recLabel, relative, stageMeta, time } from "@/lib/format";
import type { ApplicationDetail, Interview, InterviewInvite, Stage } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";

function CvViewer({ id, app }: { id: string; app: ApplicationDetail }) {
  const [tab, setTab] = useState<"pdf" | "text" | "letter">(app.cvMime === "application/pdf" ? "pdf" : "text");
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (tab !== "pdf" || url) return;
    let revoked: string | null = null;
    fileUrl(`/applications/${id}/cv`).then((u) => { revoked = u; setUrl(u); }).catch(() => setTab("text"));
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [tab, id, url]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ...(app.cvMime === "application/pdf" ? [{ value: "pdf" as const, label: "CV" }] : []),
            { value: "text", label: "Çıkarılan metin" },
            ...(app.coverLetter ? [{ value: "letter" as const, label: "Ön yazı" }] : []),
          ]}
        />
        <Button size="sm" variant="ghost" icon={<Download className="size-4" />} onClick={() => openFile(`/applications/${id}/cv`, app.cvFileName).catch((e) => toast.error(e.message))}>{app.cvFileName}</Button>
      </div>
      {tab === "pdf" && (url ? <iframe src={`${url}#toolbar=0&view=FitH`} className="h-[760px] w-full bg-slate-100" title="CV" /> : <Skeleton className="m-5 h-[600px]" />)}
      {tab === "text" && <pre className="max-h-[760px] overflow-auto p-5 font-sans text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{app.cvText || "Metin çıkarılamadı."}</pre>}
      {tab === "letter" && <p className="p-5 text-sm leading-7 whitespace-pre-wrap">{app.coverLetter}</p>}
    </div>
  );
}

function InterviewCard({ iv, onScorecard, onKit, canScore }: { iv: Interview; onScorecard: () => void; onKit: () => void; canScore: boolean }) {
  const past = new Date(iv.startsAt).getTime() < Date.now();
  const yes = iv.scorecards.filter((s) => s.recommendation.includes("YES")).length;
  return (
    <div className={clsx("rounded-xl border p-4", iv.cancelledAt ? "border-dashed border-slate-200 opacity-60 dark:border-white/10" : "border-slate-200 dark:border-white/10")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{iv.title} {iv.cancelledAt && <span className="text-xs text-rose-500">(iptal)</span>}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="size-3.5" />{dateTime(iv.startsAt)} · {iv.durationMin} dk</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Video className="size-3.5" />{iv.location}</p>
        </div>
        <button onClick={() => openFile(`/interviews/${iv.id}/ics`, "mulakat.ics")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10" title="Takvime ekle (.ics)"><CalendarPlus className="size-4" /></button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex -space-x-2">{iv.panelists.map((p) => <span key={p.user.id} title={p.user.name}><Avatar name={p.user.name} id={p.user.id} size="sm" /></span>)}</div>
        {!iv.cancelledAt && (iv.kit || canScore) && (
          <button onClick={onKit} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:hover:bg-brand-500/10">
            <ListChecks className="size-3.5" /> Mülakat kiti{iv.kit && ` · ${iv.kit.questions.length} soru`}
          </button>
        )}
      </div>
      {iv.scorecards.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-white/5">
          <p className="text-xs font-medium text-slate-500">{yes}/{iv.scorecards.length} mülakatçı olumlu</p>
          {iv.scorecards.map((s) => (
            <div key={s.id} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <b>{s.author.name}</b>
                <span className={clsx("font-semibold", recLabel[s.recommendation].cls)}>{recLabel[s.recommendation].label}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
                {Object.entries(s.ratings).map(([k, v]) => <span key={k}>{k}: <b className="text-slate-700 dark:text-slate-200">{v}/5</b></span>)}
              </div>
              {s.notes && <p className="mt-1.5 text-slate-600 dark:text-slate-300">{s.notes}</p>}
              {iv.kit && Object.keys(s.answers ?? {}).length > 0 && (
                <ul className="mt-1.5 space-y-0.5 border-t border-slate-200/70 pt-1.5 dark:border-white/10">
                  {Object.entries(s.answers).filter(([, a]) => a.note || a.signal).map(([i, a]) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                      {a.signal === "good" ? <ThumbsUp className="mt-0.5 size-3 shrink-0 text-emerald-600" /> : a.signal === "weak" ? <ThumbsDown className="mt-0.5 size-3 shrink-0 text-rose-600" /> : <span className="size-3 shrink-0" />}
                      <span><b>{iv.kit!.questions[Number(i)]?.topic ?? `Soru ${Number(i) + 1}`}:</b> {a.note || (a.signal === "good" ? "iyi" : "zayıf")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {!!iv.hiddenScorecards && <p className="mt-3 text-xs text-slate-500">{iv.hiddenScorecards} değerlendirme var. Görmek için önce kendi formunuzu doldurun.</p>}
      {canScore && past && !iv.cancelledAt && <Button size="sm" variant="soft" className="mt-3 w-full" icon={<ClipboardCheck className="size-4" />} onClick={onScorecard}>Değerlendirme formu</Button>}
    </div>
  );
}

function InviteCard({ invite, onCancel, cancelling }: { invite: InterviewInvite; onCancel?: () => void; cancelling: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-medium"><CalendarClock className="size-4 animate-pulse text-amber-600" /> Adayın saat seçmesi bekleniyor</p>
          <p className="mt-0.5 text-xs text-slate-500">{invite.title} · {invite.durationMin} dk · {invite.slots.length} seçenek · {relative(invite.createdAt)} gönderildi</p>
        </div>
        {onCancel && <button onClick={onCancel} disabled={cancelling} className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50">İptal</button>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {invite.slots.map((s) => (
          <span key={s} className="rounded-md bg-white px-2 py-0.5 text-xs tabular-nums text-slate-600 ring-1 ring-amber-200 dark:bg-white/5 dark:text-slate-300 dark:ring-amber-500/20" title={longDay(s)}>
            {date(s).replace(/ \d{4}$/, "")} {time(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, can } = useAuth();
  const { name, blind } = useBlind();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"email" | "interview" | "reject" | null>(null);
  const [scoring, setScoring] = useState<Interview | null>(null);
  const [kitFor, setKitFor] = useState<string | null>(null);
  const { data: app, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => api.get<ApplicationDetail>(`/applications/${id}`),
    refetchInterval: (q) => (q.state.data && q.state.data.aiStatus !== "DONE" && q.state.data.aiStatus !== "FAILED" ? 3000 : false),
  });

  const move = useMutation({
    mutationFn: (v: { stage: Stage; reason?: string; email?: "rejected" }) => api.patch(`/applications/${id}/move`, v),
    onSuccess: (_d, v) => {
      toast.success(`Aday "${stageMeta[v.stage].label}" aşamasına taşındı`);
      qc.invalidateQueries({ queryKey: ["application", id] });
      qc.invalidateQueries({ queryKey: ["board", app?.job.id] });
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelInvite = useMutation({
    mutationFn: (inviteId: string) => api.patch(`/invites/${inviteId}/cancel`),
    onSuccess: () => {
      toast.info("Saat seçim daveti iptal edildi");
      qc.invalidateQueries({ queryKey: ["application", id] });
    },
    onError: (e) => toast.error(e.message),
  });
  const rescore = useMutation({
    mutationFn: () => api.post(`/applications/${id}/rescore`),
    onSuccess: () => {
      toast.info("CV yeniden değerlendirme kuyruğuna alındı");
      qc.invalidateQueries({ queryKey: ["application", id] });
    },
  });

  if (isLoading || !app) {
    return <div className="space-y-4"><Skeleton className="h-28" /><div className="grid gap-6 xl:grid-cols-[1fr_380px]"><Skeleton className="h-[600px]" /><Skeleton className="h-[600px]" /></div></div>;
  }

  const c = app.candidate;
  const editable = can("OWNER", "RECRUITER");
  const idx = STAGES.indexOf(app.stage);

  return (
    <>
      <Link href={`/panel/ilanlar/${app.job.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="size-4" /> {app.job.title}</Link>

      <div className="card relative mb-6 overflow-hidden p-6 animate-fade-up">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-500/10 via-fuchsia-500/10 to-orange-400/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <Avatar name={c.name} id={c.id} size="lg" blind={blind} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{name(c)}</h1>
              <StageBadge stage={app.stage} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {blind ? <span className="italic">Kör değerlendirme açık: iletişim bilgileri gizli</span> : (
                <>
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-brand-600"><Mail className="size-4" />{c.email}</a>
                  {c.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" />{c.phone}</span>}
                  {c.city && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{c.city}</span>}
                  {c.linkedin && <a href={c.linkedin} target="_blank" className="flex items-center gap-1.5 hover:text-brand-600"><Link2 className="size-4" />LinkedIn</a>}
                </>
              )}
              <span className="flex items-center gap-1.5"><FileText className="size-4" />{app.source} · {date(app.createdAt)}</span>
            </div>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<Send className="size-4" />} onClick={() => setDialog("email")}>E-posta</Button>
              <Button variant="secondary" size="sm" icon={<CalendarPlus className="size-4" />} onClick={() => setDialog("interview")}>Mülakat planla</Button>
              <Button variant="ghost" size="sm" icon={<RefreshCw className={clsx("size-4", rescore.isPending && "animate-spin")} />} onClick={() => rescore.mutate()} title="CV'yi yeniden puanla">Yeniden puanla</Button>
            </div>
          )}
        </div>

        <div className="relative mt-6 flex items-center gap-1 overflow-x-auto">
          {STAGES.filter((s) => s !== "REJECTED").map((s, i) => {
            const done = app.stage !== "REJECTED" && i <= idx;
            return (
              <button
                key={s}
                disabled={!editable || move.isPending}
                onClick={() => s !== app.stage && move.mutate({ stage: s })}
                className={clsx(
                  "relative flex-1 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition",
                  done ? "bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10",
                  s === app.stage && "ring-2 ring-brand-300 ring-offset-2 dark:ring-offset-[#0b0b12]",
                )}
              >
                {stageMeta[s].label}
              </button>
            );
          })}
          {editable && (
            app.stage === "REJECTED" ? (
              <Button size="sm" variant="secondary" className="ml-2" onClick={() => move.mutate({ stage: "SCREENING" })}>Geri al</Button>
            ) : (
              <Button size="sm" variant="ghost" className="ml-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDialog("reject")}>Ele</Button>
            )
          )}
        </div>
        {app.stage === "REJECTED" && <p className="relative mt-3 text-sm text-slate-500">Elendi: {app.rejectReason ?? "neden belirtilmedi"} · {relative(app.stageChangedAt)}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <AnalysisPanel analysis={app.analysis} status={app.aiStatus} error={app.aiError} />
          <CvViewer id={id} app={app} />
        </div>

        <div className="space-y-6">
          {(app.interviews.length > 0 || editable) && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Mülakatlar</h3>
                {editable && <button onClick={() => setDialog("interview")} className="text-sm font-medium text-brand-600 hover:underline">+ Planla</button>}
              </div>
              {app.invites[0] && (
                <div className="mb-3">
                  <InviteCard invite={app.invites[0]} cancelling={cancelInvite.isPending} onCancel={editable ? () => cancelInvite.mutate(app.invites[0].id) : undefined} />
                </div>
              )}
              {app.interviews.length ? (
                <div className="space-y-3">
                  {app.interviews.map((iv) => (
                    <InterviewCard key={iv.id} iv={iv} canScore={!!me && (iv.panelists.some((p) => p.user.id === me.user.id) || me.role === "OWNER")} onScorecard={() => setScoring(iv)} onKit={() => setKitFor(iv.id)} />
                  ))}
                </div>
              ) : !app.invites[0] && <p className="py-4 text-center text-sm text-slate-500">Henüz mülakat planlanmadı.</p>}
            </div>
          )}

          <Timeline applicationId={id} activities={app.activities} />

          {app.emails.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Gönderilen e-postalar</h3>
              <ul className="space-y-2">
                {app.emails.map((e) => (
                  <li key={e.id}>
                    <details className="group rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{e.subject}</span>
                        <span className={clsx("shrink-0 text-xs", e.status === "SENT" ? "text-emerald-600" : "text-amber-600")}>{e.status === "SENT" ? "Gönderildi" : "Kuyrukta"} · {relative(e.createdAt)}</span>
                      </summary>
                      <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 whitespace-pre-wrap text-slate-600 dark:border-white/10 dark:text-slate-300">{e.body}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {app.otherApplications.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Diğer başvuruları</h3>
              {app.otherApplications.map((o) => (
                <Link key={o.id} href={`/panel/basvurular/${o.id}`} className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                  <span>{o.job.title}</span>
                  <StageBadge stage={o.stage} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <EmailDialog open={dialog === "email"} onClose={() => setDialog(null)} applicationId={id} />
      <InterviewDialog open={dialog === "interview"} onClose={() => setDialog(null)} applicationId={id} />
      <RejectDialog open={dialog === "reject"} count={1} onClose={() => setDialog(null)} onConfirm={(reason, email) => { move.mutate({ stage: "REJECTED", reason, email: email ? "rejected" : undefined }); setDialog(null); }} />
      <KitDialog
        interview={app.interviews.find((iv) => iv.id === kitFor) ?? null}
        applicationId={id}
        requirements={app.job.requirements}
        canRegenerate={editable || (!!me && !!app.interviews.find((iv) => iv.id === kitFor)?.panelists.some((p) => p.user.id === me.user.id))}
        onClose={() => setKitFor(null)}
      />
      {me && scoring && <ScorecardDialog interview={scoring} applicationId={id} userId={me.user.id} onClose={() => setScoring(null)} />}
    </>
  );
}
