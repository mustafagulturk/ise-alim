"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CalendarPlus, CalendarSearch, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { longDay, roleLabel, time } from "@/lib/format";
import type { Member, SlotSuggestions } from "@/lib/types";
import { Avatar, Button, Field, Modal, Skeleton, Tabs } from "./ui";

function defaultStart() {
  const d = new Date(Date.now() + 2 * 86400_000);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MAX_SLOTS = 10;

/**
 * İki yol: tarihi İK belirler ya da mülakatçıların boş saatlerinden seçenek gönderilir ve adayın seçmesi beklenir.
 */
export function InterviewDialog({ open, onClose, applicationId }: { open: boolean; onClose: () => void; applicationId: string }) {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => api.get<Member[]>("/company/members"), enabled: open });
  const [mode, setMode] = useState<"invite" | "fixed">("invite");
  const [form, setForm] = useState({ title: "Teknik mülakat", startsAt: defaultStart(), durationMin: 60, location: "Google Meet", panelistIds: [] as string[], sendEmail: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);

  const slots = useQuery({
    queryKey: ["invite-slots", applicationId, form.panelistIds.join(","), form.durationMin],
    queryFn: () => api.get<SlotSuggestions>(`/applications/${applicationId}/invite-slots?panelistIds=${form.panelistIds.join(",")}&durationMin=${form.durationMin}`),
    enabled: open && mode === "invite" && form.panelistIds.length > 0,
  });

  const done = (message: string, description?: string) => {
    toast.success(message, { description });
    qc.invalidateQueries({ queryKey: ["application", applicationId] });
    qc.invalidateQueries({ queryKey: ["interviews"] });
    setPicked([]);
    onClose();
  };
  const fail = (e: Error) => {
    if (e instanceof ApiError) setErrors(e.fields);
    toast.error(e.message);
  };

  const create = useMutation({
    mutationFn: async () => {
      const { sendEmail, ...body } = form;
      const iv = await api.post(`/applications/${applicationId}/interviews`, { ...body, startsAt: new Date(form.startsAt).toISOString() });
      if (sendEmail) await api.post(`/applications/${applicationId}/emails`, { template: "interview" });
      return iv;
    },
    onSuccess: () => done("Mülakat planlandı", form.sendEmail ? "Adaya davet e-postası gönderildi." : undefined),
    onError: fail,
  });

  const invite = useMutation({
    mutationFn: () => {
      const { startsAt: _s, ...body } = form;
      return api.post(`/applications/${applicationId}/invites`, { ...body, slots: picked });
    },
    onSuccess: () => done("Saat seçenekleri gönderildi", `Aday ${picked.length} seçenekten birini seçince mülakat takvime işlenecek.`),
    onError: fail,
  });

  const toggle = (id: string) => {
    setPicked([]);
    setForm((f) => ({ ...f, panelistIds: f.panelistIds.includes(id) ? f.panelistIds.filter((x) => x !== id) : [...f.panelistIds, id] }));
  };
  const togglePick = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length >= MAX_SLOTS ? p : [...p, s].sort()));

  return (
    <Modal open={open} onClose={onClose} title="Mülakat planla" wide>
      <form onSubmit={(e) => { e.preventDefault(); if (mode === "fixed") create.mutate(); else invite.mutate(); }} className="space-y-4">
        <Tabs
          value={mode}
          onChange={setMode}
          items={[
            { value: "invite", label: <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> Aday seçsin</span> },
            { value: "fixed", label: "Tarihi ben belirleyeyim" },
          ]}
        />
        {mode === "invite" && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            Mülakatçıların takviminden boş saatleri buluruz, siz birkaçını seçersiniz. Aday takip sayfasından birini seçtiğinde mülakat otomatik oluşur ve herkese bildirim gider.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlık" error={errors.title}><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Yer / bağlantı" error={errors.location}><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          {mode === "fixed" && (
            <Field label="Tarih ve saat" error={errors.startsAt}><input type="datetime-local" className="field" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
          )}
          <Field label="Süre">
            <select className="field" value={form.durationMin} onChange={(e) => { setPicked([]); setForm({ ...form, durationMin: Number(e.target.value) }); }}>
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

        {mode === "invite" && (
          <Field label={`Adaya gönderilecek saatler${picked.length ? ` (${picked.length}/${MAX_SLOTS})` : ""}`} error={errors.slots}>
            {!form.panelistIds.length ? (
              <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10"><CalendarSearch className="size-4" /> Boş saatleri görmek için mülakatçı seçin.</p>
            ) : slots.isLoading ? (
              <Skeleton className="h-32" />
            ) : !slots.data?.days.length ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Önümüzdeki iki haftada ortak boş saat bulunamadı.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Hafta içi 09:00-18:00, öğle arası ve mevcut mülakatlar hariç.</span>
                  <button type="button" onClick={() => setPicked(slots.data!.suggested)} className="shrink-0 text-xs font-medium text-brand-600 hover:underline">Önerilenleri seç</button>
                </div>
                <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                  {slots.data.days.map((d) => (
                    <div key={d.date}>
                      <p className="mb-1 text-xs font-semibold text-slate-600 capitalize dark:text-slate-300">{longDay(d.slots[0])}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.slots.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => togglePick(s)}
                            className={clsx(
                              "rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums transition",
                              picked.includes(s) ? "border-brand-500 bg-brand-600 text-white shadow-sm" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:hover:bg-brand-500/10",
                              !picked.includes(s) && slots.data!.suggested.includes(s) && "border-brand-200 dark:border-brand-500/30",
                            )}
                          >
                            {time(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-600" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
          {mode === "invite" ? "Adaya saat seçim bağlantısını e-postayla gönder" : "Adaya davet e-postası gönder"}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          {mode === "fixed" ? (
            <Button type="submit" icon={<CalendarPlus className="size-4" />} loading={create.isPending}>Planla</Button>
          ) : (
            <Button type="submit" icon={<Send className="size-4" />} loading={invite.isPending} disabled={!picked.length}>
              {picked.length ? `${picked.length} seçenek gönder` : "Saat seçin"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
