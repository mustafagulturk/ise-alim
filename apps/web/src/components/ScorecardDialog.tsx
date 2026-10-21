"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { recLabel } from "@/lib/format";
import type { Interview, Recommendation } from "@/lib/types";
import { Button, Field, Modal } from "./ui";

const RECS: Recommendation[] = ["STRONG_NO", "NO", "YES", "STRONG_YES"];

export function ScorecardDialog({ interview, applicationId, userId, onClose }: { interview: Interview | null; applicationId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const criteria = useQuery({ queryKey: ["criteria"], queryFn: () => api.get<string[]>("/interviews/criteria"), staleTime: Infinity });
  const existing = interview?.scorecards.find((s) => s.author.id === userId);
  const [ratings, setRatings] = useState<Record<string, number>>(existing?.ratings ?? {});
  const [rec, setRec] = useState<Recommendation | null>(existing?.recommendation ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const save = useMutation({
    mutationFn: () => api.put(`/interviews/${interview!.id}/scorecard`, { ratings, recommendation: rec, notes }),
    onSuccess: () => {
      toast.success("Değerlendirmeniz kaydedildi");
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const complete = criteria.data?.every((c) => ratings[c]) && rec;

  return (
    <Modal open={!!interview} onClose={onClose} title="Mülakat değerlendirme formu" wide>
      <div className="space-y-5">
        <div className="space-y-3">
          {criteria.data?.map((c) => (
            <div key={c} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
              <span className="text-sm font-medium">{c}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRatings({ ...ratings, [c]: n })} aria-label={`${c}: ${n}`}>
                    <Star className={clsx("size-5 transition hover:scale-110", n <= (ratings[c] ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Field label="Genel kanaatiniz">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RECS.map((r) => (
              <button
                key={r}
                onClick={() => setRec(r)}
                className={clsx(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition",
                  rec === r ? (r.includes("YES") ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300") : "border-slate-200 hover:border-slate-300 dark:border-white/10",
                )}
              >
                {recLabel[r].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notlar" hint="Diğer mülakatçılar formunuzu ancak kendi formlarını doldurduktan sonra görür.">
          <textarea className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adayın öne çıkan yanları, endişeleriniz…" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!complete}>Kaydet</Button>
        </div>
      </div>
    </Modal>
  );
}
