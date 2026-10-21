"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { GripVertical, Plus, Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import type { Job, JobStatus, Requirement, WorkType } from "@/lib/types";
import { Button, Field, Modal } from "./ui";

type Form = Omit<Job, "id" | "slug" | "createdAt" | "publishedAt" | "requirements"> & { requirements: Requirement[] };

const EMPTY: Form = {
  title: "",
  department: "",
  location: "",
  workType: "HYBRID",
  employmentType: "Tam zamanlı",
  description: "",
  salaryMin: null,
  salaryMax: null,
  status: "OPEN",
  requirements: [],
};

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(job ? { ...job } : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rescoreFor, setRescoreFor] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setReq = (i: number, patch: Partial<Requirement>) => set("requirements", form.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const suggest = useMutation({
    mutationFn: () => api.post<{ requirements: Requirement[] }>("/jobs/suggest-requirements", { title: form.title, description: form.description }),
    onSuccess: (r) => {
      if (!r.requirements.length) return toast.info("Açıklamada madde işaretli bir nitelik listesi bulunamadı.");
      set("requirements", [...form.requirements, ...r.requirements]);
      toast.success(`${r.requirements.length} kriter önerildi`, { description: "Ağırlıkları ve zorunluluk durumunu kontrol edin." });
    },
    onError: (e) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (status: JobStatus) => {
      const body = { ...form, status, requirements: form.requirements.map(({ id, text, keywords, weight, mustHave }) => ({ id, text, keywords, weight, mustHave })) };
      return job ? api.put<Job & { requirementsChanged?: boolean }>(`/jobs/${job.id}`, body) : api.post<Job>("/jobs", body);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", saved.id] });
      toast.success(job ? "İlan güncellendi" : "İlan oluşturuldu");
      if ("requirementsChanged" in saved && saved.requirementsChanged) setRescoreFor(saved.id);
      else router.push(`/panel/ilanlar/${saved.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fields);
      toast.error(e.message);
    },
  });

  const rescore = useMutation({
    mutationFn: (id: string) => api.post<{ queued: number }>(`/jobs/${id}/rescore`),
    onSuccess: (r, id) => {
      toast.success(`${r.queued} başvuru yeniden puanlanıyor`);
      router.push(`/panel/ilanlar/${id}`);
    },
  });

  const totalWeight = form.requirements.reduce((s, r) => s + r.weight, 0) || 1;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="card space-y-5 p-6 animate-fade-up">
        <h2 className="font-semibold">İlan bilgileri</h2>
        <Field label="Pozisyon adı" error={errors.title}>
          <input className="field" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Örn. Kıdemli Backend Geliştirici" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Departman" error={errors.department}>
            <input className="field" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Mühendislik" />
          </Field>
          <Field label="Konum" error={errors.location}>
            <input className="field" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="İstanbul" />
          </Field>
          <Field label="Çalışma şekli">
            <select className="field" value={form.workType} onChange={(e) => set("workType", e.target.value as WorkType)}>
              <option value="ONSITE">Ofisten</option>
              <option value="HYBRID">Hibrit</option>
              <option value="REMOTE">Uzaktan</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Çalışma tipi">
            <select className="field" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
              {["Tam zamanlı", "Yarı zamanlı", "Sözleşmeli", "Staj"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Maaş alt (₺, isteğe bağlı)">
            <input className="field" type="number" min={0} value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Maaş üst (₺)" error={errors.salaryMax}>
            <input className="field" type="number" min={0} value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value ? Number(e.target.value) : null)} />
          </Field>
        </div>
        <Field label="İlan açıklaması" error={errors.description} hint="Markdown desteklenir: ## başlık, - madde">
          <textarea className="field min-h-72 font-mono text-[13px] leading-6" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={"## Neler yapacaksın?\n- ...\n\n## Aradığımız nitelikler\n- En az 3 yıl ... deneyimi\n- ..."} />
        </Field>
      </div>

      <div className="space-y-4 animate-fade-up [animation-delay:80ms]">
        <div className="card p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Değerlendirme kriterleri</h2>
            <span className="text-xs text-slate-500">{form.requirements.length}/15</span>
          </div>
          <p className="mb-4 text-xs text-slate-500">Yapay zekâ her CV'yi bu kriterlere göre kanıt arayarak değerlendirir. Puan, kriter ağırlıklarından hesaplanır.</p>

          <Button
            variant="soft"
            className="mb-4 w-full"
            icon={<Wand2 className="size-4" />}
            loading={suggest.isPending}
            onClick={() => suggest.mutate()}
            disabled={form.description.length < 30}
          >
            Açıklamadan kriter öner
          </Button>

          <div className="space-y-3">
            {form.requirements.map((r, i) => (
              <div key={r.id ?? i} className="group rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 size-4 shrink-0 text-slate-300" />
                  <input className="field flex-1 bg-white" value={r.text} onChange={(e) => setReq(i, { text: e.target.value })} placeholder="Örn. En az 3 yıl React deneyimi" />
                  <button onClick={() => set("requirements", form.requirements.filter((_, j) => j !== i))} className="mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Kriteri sil">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-3 pl-6">
                  <div className="flex items-center gap-0.5" title="Önem derecesi">
                    {[1, 2, 3, 4, 5].map((w) => (
                      <button key={w} onClick={() => setReq(i, { weight: w })} aria-label={`Ağırlık ${w}`}>
                        <Star className={clsx("size-4 transition", w <= r.weight ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300")} />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">%{Math.round((r.weight / totalWeight) * 100)}</span>
                  <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <input type="checkbox" className="accent-rose-600" checked={r.mustHave} onChange={(e) => setReq(i, { mustHave: e.target.checked })} />
                    Olmazsa olmaz
                  </label>
                </div>
                <input
                  className="mt-2 ml-6 w-[calc(100%-1.5rem)] rounded-lg border-0 bg-transparent px-2 py-1 text-xs text-slate-500 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-brand-300 focus:outline-none dark:focus:bg-white/5"
                  value={r.keywords.join(", ")}
                  onChange={(e) => setReq(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                  placeholder="Anahtar kelimeler (boş bırakılırsa otomatik)"
                />
              </div>
            ))}
          </div>
          {errors.requirements && <p className="mt-2 text-xs text-rose-600">{errors.requirements}</p>}
          <Button variant="secondary" className="mt-3 w-full" icon={<Plus className="size-4" />} onClick={() => set("requirements", [...form.requirements, { text: "", keywords: [], weight: 3, mustHave: false }])} disabled={form.requirements.length >= 15}>
            Kriter ekle
          </Button>
        </div>

        <div className="card flex flex-col gap-2 p-4 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={() => save.mutate("DRAFT")} loading={save.isPending && save.variables === "DRAFT"}>
            Taslak kaydet
          </Button>
          <Button className="flex-1" icon={<Sparkles className="size-4" />} onClick={() => save.mutate("OPEN")} loading={save.isPending && save.variables === "OPEN"}>
            {job?.status === "OPEN" ? "Kaydet" : "Yayınla"}
          </Button>
        </div>
      </div>

      <Modal open={!!rescoreFor} onClose={() => router.push(`/panel/ilanlar/${rescoreFor}`)} title="Kriterler değişti">
        <p className="text-sm text-slate-600 dark:text-slate-300">Mevcut başvurular eski kriterlere göre puanlandı. Hepsini yeni kriterlerle yeniden değerlendirmek ister misiniz?</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push(`/panel/ilanlar/${rescoreFor}`)}>Şimdi değil</Button>
          <Button icon={<Sparkles className="size-4" />} loading={rescore.isPending} onClick={() => rescore.mutate(rescoreFor!)}>Yeniden puanla</Button>
        </div>
      </Modal>
    </div>
  );
}
