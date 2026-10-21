"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { roleLabel } from "@/lib/format";
import type { Member } from "@/lib/types";
import { Avatar, Button, Field, Modal } from "./ui";

function defaultStart() {
  const d = new Date(Date.now() + 2 * 86400_000);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewDialog({ open, onClose, applicationId }: { open: boolean; onClose: () => void; applicationId: string }) {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => api.get<Member[]>("/company/members"), enabled: open });
  const [form, setForm] = useState({ title: "Teknik mülakat", startsAt: defaultStart(), durationMin: 60, location: "Google Meet", panelistIds: [] as string[], sendEmail: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const { sendEmail, ...body } = form;
      const iv = await api.post(`/applications/${applicationId}/interviews`, { ...body, startsAt: new Date(form.startsAt).toISOString() });
      if (sendEmail) await api.post(`/applications/${applicationId}/emails`, { template: "interview" });
      return iv;
    },
    onSuccess: () => {
      toast.success("Mülakat planlandı", { description: form.sendEmail ? "Adaya davet e-postası gönderildi." : undefined });
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fields);
      toast.error(e.message);
    },
  });

  const toggle = (id: string) => setForm((f) => ({ ...f, panelistIds: f.panelistIds.includes(id) ? f.panelistIds.filter((x) => x !== id) : [...f.panelistIds, id] }));

  return (
    <Modal open={open} onClose={onClose} title="Mülakat planla" wide>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlık" error={errors.title}><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Yer / bağlantı" error={errors.location}><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Tarih ve saat" error={errors.startsAt}><input type="datetime-local" className="field" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
          <Field label="Süre">
            <select className="field" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}>
              {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} dakika</option>)}
            </select>
          </Field>
        </div>
        <Field label="Mülakatçılar" error={errors.panelistIds}>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.data?.map((m) => (
              <button
                type="button"
                key={m.userId}
                onClick={() => toggle(m.userId)}
                className={clsx("flex items-center gap-3 rounded-xl border p-2.5 text-left transition", form.panelistIds.includes(m.userId) ? "border-brand-400 bg-brand-50 ring-2 ring-brand-500/15 dark:bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-white/10")}
              >
                <Avatar name={m.name} id={m.userId} size="sm" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{m.name}</span><span className="text-xs text-slate-500">{roleLabel[m.role]}</span></span>
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-600" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
          Adaya davet e-postası gönder
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" icon={<CalendarPlus className="size-4" />} loading={create.isPending}>Planla</Button>
        </div>
      </form>
    </Modal>
  );
}
