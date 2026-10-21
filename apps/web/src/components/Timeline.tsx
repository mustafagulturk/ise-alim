"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarPlus, ClipboardCheck, FileInput, Mail, MessageSquare, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { recLabel, relative, stageMeta } from "@/lib/format";
import type { Activity, Recommendation, Stage } from "@/lib/types";
import { Avatar, Button } from "./ui";

const ICON = {
  applied: { icon: FileInput, cls: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  stage: { icon: ArrowRight, cls: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" },
  note: { icon: MessageSquare, cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
  scored: { icon: Sparkles, cls: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300" },
  email: { icon: Mail, cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  interview: { icon: CalendarPlus, cls: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
  scorecard: { icon: ClipboardCheck, cls: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300" },
} as const;

function describe(a: Activity) {
  const d = a.data as Record<string, string | number>;
  const who = a.actor?.name ?? "Sistem";
  switch (a.type) {
    case "applied":
      return <>Aday <b>{d.source ?? "kariyer sayfası"}</b> üzerinden başvurdu</>;
    case "stage":
      return <><b>{who}</b> adayı <b>{stageMeta[d.from as Stage]?.label}</b> → <b>{stageMeta[d.to as Stage]?.label}</b> aşamasına taşıdı{d.reason ? <span className="text-slate-500"> ({d.reason})</span> : null}</>;
    case "scored":
      return <>CV {d.provider === "claude" ? "Claude ile" : "yerel puanlayıcıyla"} değerlendirildi: <b>{d.score} puan</b></>;
    case "email":
      return <><b>{who}</b> e-posta gönderdi: <span className="text-slate-500">{d.subject}</span></>;
    case "interview":
      return <><b>{who}</b> mülakat planladı: <span className="text-slate-500">{d.title}</span></>;
    case "scorecard":
      return <><b>{who}</b> değerlendirme formu doldurdu: <span className={recLabel[d.recommendation as Recommendation]?.cls}>{recLabel[d.recommendation as Recommendation]?.label}</span></>;
    default:
      return null;
  }
}

export function Timeline({ applicationId, activities }: { applicationId: string; activities: Activity[] }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const note = useMutation({
    mutationFn: () => api.post<Activity>(`/applications/${applicationId}/notes`, { body }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold">Notlar ve geçmiş</h3>
      <form
        onSubmit={(e) => { e.preventDefault(); if (body.trim()) note.mutate(); }}
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.02]"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) note.mutate(); }}
          rows={2}
          placeholder="Ekibe not bırakın… (Ctrl+Enter)"
          className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
        />
        <div className="flex justify-end">
          <Button size="sm" type="submit" icon={<Send className="size-3.5" />} loading={note.isPending} disabled={!body.trim()}>Not ekle</Button>
        </div>
      </form>

      <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-slate-200 dark:before:bg-white/10">
        {activities.map((a) => {
          const m = ICON[a.type] ?? ICON.note;
          const Icon = m.icon;
          return (
            <li key={a.id} className="relative flex gap-3 animate-fade-up">
              <span className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-white dark:ring-[#0f0f18] ${m.cls}`}><Icon className="size-3.5" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                {a.type === "note" ? (
                  <div className="rounded-xl rounded-tl-sm bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <div className="mb-1 flex items-center gap-2">
                      {a.actor && <Avatar name={a.actor.name} id={a.actor.id} size="sm" />}
                      <b className="text-sm">{a.actor?.name}</b>
                      <span className="text-xs text-slate-400">{relative(a.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{String(a.data.body)}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{describe(a)}</p>
                    <p className="text-xs text-slate-400">{relative(a.createdAt)}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
