"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CalendarDays, Check, ChevronDown, Mail, MapPin, PartyPopper, Video } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";
import { Button, Modal, Skeleton } from "@/components/ui";
import { date, dateTime } from "@/lib/format";

interface Tracking {
  name: string;
  job: { title: string; slug: string; location: string; company: { name: string; slug: string; brandColor: string } };
  appliedAt: string;
  status: "active" | "offer" | "closed";
  withdrawn: boolean;
  steps: { label: string; done: boolean; current: boolean }[];
  stageLabel: string;
  interviews: { id: string; title: string; startsAt: string; durationMin: number; location: string }[];
  emails: { id: string; subject: string; body: string; createdAt: string }[];
}

async function get(token: string) {
  const res = await fetch(`/api/track/${token}`);
  if (!res.ok) throw new Error("Başvuru bulunamadı");
  return (await res.json()) as Tracking;
}

export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [confirm, setConfirm] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["track", token], queryFn: () => get(token), retry: false });
  const withdraw = useMutation({
    mutationFn: () => fetch(`/api/track/${token}/withdraw`, { method: "POST" }).then((r) => { if (!r.ok) throw new Error("İşlem yapılamadı"); }),
    onSuccess: () => { toast.success("Başvurunuz geri çekildi"); setConfirm(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="mx-auto max-w-2xl space-y-4 p-6 pt-16"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (error || !data) return <div className="grid min-h-dvh place-items-center p-6 text-center"><div><p className="text-xl font-semibold">Başvuru bulunamadı</p><p className="mt-2 text-slate-500">Bağlantı hatalı ya da başvuru silinmiş olabilir.</p></div></div>;

  const color = data.job.company.brandColor;
  return (
    <div className="min-h-dvh pb-16">
      <div className="h-56" style={{ background: `linear-gradient(135deg, ${color}, #0f0f1a)` }} />
      <main className="mx-auto -mt-40 max-w-2xl space-y-5 px-5">
        <div className="card p-6 animate-fade-up">
          <p className="text-sm text-slate-500">{data.job.company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">Merhaba {data.name},</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300"><b>{data.job.title}</b> başvurunun güncel durumu aşağıda. Başvuru tarihi: {date(data.appliedAt)}</p>

          {data.status === "closed" ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {data.withdrawn ? "Başvurunu geri çektin. İlgin için teşekkür ederiz." : "Bu pozisyon için süreç tamamlandı. Gösterdiğin ilgi için teşekkür ederiz; yeni ilanlarda tekrar görüşmek dileğiyle."}
            </div>
          ) : (
            <ol className="mt-8 grid grid-cols-4 gap-2">
              {data.steps.map((s, i) => (
                <li key={s.label} className="relative text-center">
                  {i > 0 && <span className="absolute top-4 right-1/2 -z-0 h-0.5 w-full" style={{ background: s.done || s.current ? color : "#e2e8f0" }} />}
                  <span
                    className={clsx("relative z-10 mx-auto grid size-8 place-items-center rounded-full text-xs font-semibold ring-4 ring-white dark:ring-[#0b0b12]", s.current && "animate-pulse-ring")}
                    style={{ background: s.done || s.current ? color : "#e2e8f0", color: s.done || s.current ? "#fff" : "#64748b" }}
                  >
                    {s.done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className={clsx("mt-2 block text-xs", s.current ? "font-semibold" : "text-slate-500")}>{s.label}</span>
                </li>
              ))}
            </ol>
          )}
          {data.status === "offer" && (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><PartyPopper className="size-5" /> Tebrikler! Ekip seninle teklif aşamasında iletişime geçecek.</p>
          )}
        </div>

        {data.interviews.length > 0 && (
          <div className="card p-6 animate-fade-up">
            <h2 className="font-semibold">Mülakatların</h2>
            <div className="mt-4 space-y-3">
              {data.interviews.map((i) => (
                <div key={i.id} className="flex gap-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }}><CalendarDays className="size-5" /></span>
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-slate-500">{dateTime(i.startsAt)} · {i.durationMin} dakika</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">{/meet|zoom|teams/i.test(i.location) ? <Video className="size-4" /> : <MapPin className="size-4" />}{i.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.emails.length > 0 && (
          <div className="card p-6 animate-fade-up">
            <h2 className="flex items-center gap-2 font-semibold"><Mail className="size-4" /> Sana gönderilen mesajlar</h2>
            <div className="mt-4 space-y-2">
              {data.emails.map((e) => (
                <details key={e.id} className="group rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                    {e.subject}
                    <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-slate-400">{date(e.createdAt)}<ChevronDown className="size-4 transition group-open:rotate-180" /></span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{e.body}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {data.status === "active" && (
          <p className="text-center text-sm text-slate-500">
            Fikrini mi değiştirdin? <button onClick={() => setConfirm(true)} className="font-medium underline">Başvurumu geri çek</button>
          </p>
        )}
      </main>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Başvuruyu geri çek">
        <p className="text-sm text-slate-600 dark:text-slate-300">Başvurunu geri çekmek istediğine emin misin? Bu işlem geri alınamaz.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Vazgeç</Button>
          <Button variant="danger" loading={withdraw.isPending} onClick={() => withdraw.mutate()}>Geri çek</Button>
        </div>
      </Modal>
    </div>
  );
}
