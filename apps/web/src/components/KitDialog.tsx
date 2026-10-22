"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Bot, ChevronDown, CornerDownRight, Cpu, Printer, RefreshCw, ShieldAlert, ThumbsUp, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { relative } from "@/lib/format";
import type { Interview, InterviewKit, KitQuestion } from "@/lib/types";
import { Badge, Button, Modal } from "./ui";

export function ProviderBadge({ kit }: { kit: Pick<InterviewKit, "provider" | "model"> }) {
  return (
    <Badge className={kit.provider === "claude" ? "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20" : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"}>
      {kit.provider === "claude" ? <Bot className="size-3" /> : <Cpu className="size-3" />}
      {kit.provider === "claude" ? "Claude ile hazırlandı" : "Yerel şablon"}
    </Badge>
  );
}

function QuestionItem({ q, n, open, onToggle, requirement }: { q: KitQuestion; n: number; open: boolean; onToggle: () => void; requirement?: string }) {
  return (
    <li className="rounded-xl border border-slate-200 transition dark:border-white/10">
      <button onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">{q.topic}</span>
          <span className="mt-0.5 block font-medium leading-snug">{q.question}</span>
        </span>
        <ChevronDown className={clsx("mt-1 size-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm animate-fade-up dark:border-white/5">
          <p className="text-slate-600 dark:text-slate-300"><b>Neden:</b> {q.why}{requirement && <span className="text-slate-400"> · {requirement}</span>}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><ThumbsUp className="size-3.5" /> İyi cevapta duyulmalı</p>
              <ul className="space-y-1 text-emerald-900 dark:text-emerald-100">{q.goodSigns.map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-500/10">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300"><ShieldAlert className="size-3.5" /> Dikkat</p>
              <ul className="space-y-1 text-rose-900 dark:text-rose-100">{q.redFlags.map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
          </div>
          <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300"><CornerDownRight className="mt-0.5 size-4 shrink-0 text-brand-500" /> <span><b>Takip sorusu:</b> {q.followUp}</span></p>
        </div>
      )}
    </li>
  );
}

/** Mülakatçının elindeki adaya özel soru seti. Mülakat planlanınca otomatik hazırlanır, istenirse yenilenir. */
export function KitDialog({ interview, applicationId, requirements, canRegenerate, onClose }: {
  interview: Interview | null;
  applicationId: string;
  requirements: { id: string; text: string }[];
  canRegenerate: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<number | null>(0);
  const regenerate = useMutation({
    mutationFn: () => api.post<InterviewKit>(`/interviews/${interview!.id}/kit`),
    onSuccess: (kit) => {
      toast.success("Mülakat kiti yenilendi", { description: kit.provider === "claude" ? "Claude adaya özel soruları hazırladı." : "Yerel şablonlarla hazırlandı." });
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
      setOpen(0);
    },
    onError: (e) => toast.error(e.message),
  });
  const kit = interview?.kit;
  const reqText = (id: string | null) => requirements.find((r) => r.id === id)?.text;

  return (
    <Modal open={!!interview} onClose={onClose} title={`Mülakat kiti · ${interview?.title ?? ""}`} wide>
      {!kit ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-slate-500">Bu mülakat için henüz kit hazırlanmadı.</p>
          {canRegenerate && <Button onClick={() => regenerate.mutate()} loading={regenerate.isPending} icon={<RefreshCw className="size-4" />}>Kiti hazırla</Button>}
        </div>
      ) : (
        <div className={clsx("space-y-4 print:text-black", regenerate.isPending && "pointer-events-none opacity-60")}>
          <div className="flex flex-wrap items-center gap-2">
            <ProviderBadge kit={kit} />
            <span className="text-xs text-slate-500">{relative(kit.generatedAt)} · {kit.questions.length} soru · {interview!.durationMin} dk</span>
            <div className="ml-auto flex gap-1 print:hidden">
              <Button size="sm" variant="ghost" icon={<Printer className="size-4" />} onClick={() => window.print()}>Yazdır</Button>
              {canRegenerate && <Button size="sm" variant="ghost" icon={<RefreshCw className={clsx("size-4", regenerate.isPending && "animate-spin")} />} onClick={() => regenerate.mutate()}>Yeniden hazırla</Button>}
            </div>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-gradient-to-r from-brand-500/10 to-fuchsia-500/10 px-4 py-3 text-sm leading-relaxed">
            <Target className="mt-0.5 size-4 shrink-0 text-brand-600" />
            {kit.focus}
          </p>
          <ol className="stagger max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {kit.questions.map((q, i) => (
              <QuestionItem key={i} q={q} n={i + 1} open={open === i} onToggle={() => setOpen(open === i ? null : i)} requirement={reqText(q.requirementId)} />
            ))}
          </ol>
          <p className="text-xs text-slate-500">Sorular CV analizine göre hazırlanır. Ayrımcı konular (yaş, medeni hal, aile planı, sağlık) kit dışında tutulur ve sorulmamalıdır.</p>
        </div>
      )}
    </Modal>
  );
}
