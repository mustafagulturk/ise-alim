"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, Button, Empty, Field, Modal, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relative, roleLabel } from "@/lib/format";
import type { Company, Email, Member, Role } from "@/lib/types";

const COLORS = ["#6d28d9", "#0f766e", "#1d4ed8", "#be123c", "#c2410c", "#0f172a"];

function CompanyTab() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company"], queryFn: () => api.get<Company>("/company") });
  const [form, setForm] = useState<Company | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  const save = useMutation({
    mutationFn: () => api.patch<Company>("/company", { name: form!.name, about: form!.about, website: form!.website ?? "", brandColor: form!.brandColor }),
    onSuccess: () => { toast.success("Şirket bilgileri kaydedildi"); qc.invalidateQueries({ queryKey: ["company"] }); setErrors({}); },
    onError: (e) => { if (e instanceof ApiError) setErrors(e.fields); toast.error(e.message); },
  });
  if (!form) return <Skeleton className="h-80" />;
  const disabled = !can("OWNER");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card space-y-4 p-6">
        <Field label="Şirket adı" error={errors.name}><input className="field" disabled={disabled} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Web sitesi" error={errors.website}><input className="field" disabled={disabled} value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></Field>
        <Field label="Hakkımızda" hint="Kariyer sayfanızın üst kısmında görünür."><textarea className="field min-h-32" disabled={disabled} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></Field>
        <Field label="Marka rengi" error={errors.brandColor}>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} disabled={disabled} onClick={() => setForm({ ...form, brandColor: c })} className={clsx("size-9 rounded-xl transition", form.brandColor === c && "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-[#0b0b12]")} style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </Field>
        {!disabled && <Button onClick={() => save.mutate()} loading={save.isPending}>Kaydet</Button>}
      </div>
      <div className="card overflow-hidden">
        <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${form.brandColor}, ${form.brandColor}cc)` }}>
          <p className="text-xs opacity-80">Kariyer sayfası önizlemesi</p>
          <p className="mt-6 text-xl font-semibold">{form.name}'de kariyer</p>
          <p className="mt-1 line-clamp-3 text-sm opacity-90">{form.about || "Şirketinizi adaylara anlatın."}</p>
        </div>
        <div className="p-5 text-sm">
          <p className="text-slate-500">Adres</p>
          <a href={`/kariyer/${form.slug}`} target="_blank" className="font-medium text-brand-600 hover:underline">{typeof window !== "undefined" ? location.host : ""}/kariyer/{form.slug}</a>
        </div>
      </div>
    </div>
  );
}

function TeamTab() {
  const { me, can } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["members"], queryFn: () => api.get<Member[]>("/company/members") });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "RECRUITER" as Role, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidate = () => qc.invalidateQueries({ queryKey: ["members"] });
  const add = useMutation({
    mutationFn: () => api.post("/company/members", form),
    onSuccess: () => { toast.success(`${form.name} ekibe eklendi`); setOpen(false); setForm({ name: "", email: "", role: "RECRUITER", password: "" }); invalidate(); },
    onError: (e) => { if (e instanceof ApiError) setErrors(e.fields); toast.error(e.message); },
  });
  const role = useMutation({ mutationFn: (v: { id: string; role: Role }) => api.patch(`/company/members/${v.id}`, { role: v.role }), onSuccess: invalidate, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/company/members/${id}`), onSuccess: () => { toast.success("Üye çıkarıldı"); invalidate(); }, onError: (e) => toast.error(e.message) });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/5">
        <div>
          <h2 className="font-semibold">Ekip</h2>
          <p className="text-xs text-slate-500">Yönetici her şeyi yapar; İK uzmanı ilan ve adayları yönetir; mülakatçı adayları görür, not ve değerlendirme girer.</p>
        </div>
        {can("OWNER") && <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Üye ekle</Button>}
      </div>
      {isLoading ? <Skeleton className="m-5 h-40" /> : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {data?.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-5 py-3">
              <Avatar name={m.name} id={m.userId} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name} {m.userId === me?.user.id && <span className="text-xs text-slate-400">(sen)</span>}</p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              {can("OWNER") && m.userId !== me?.user.id ? (
                <>
                  <select className="field h-9 w-auto py-1" value={m.role} onChange={(e) => role.mutate({ id: m.id, role: e.target.value as Role })}>
                    {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </select>
                  <button onClick={() => remove.mutate(m.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Çıkar"><Trash2 className="size-4" /></button>
                </>
              ) : <span className="text-sm text-slate-500">{roleLabel[m.role]}</span>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Ekibe üye ekle">
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-4">
          <Field label="Ad soyad" error={errors.name}><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="E-posta" error={errors.email}><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Rol">
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
          </Field>
          <Field label="Geçici şifre" error={errors.password} hint="Üyeye kendiniz iletin; ilk girişte değiştirmesini önerin."><input className="field" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button><Button type="submit" loading={add.isPending}>Ekle</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function OutboxTab() {
  const { data, isLoading } = useQuery({ queryKey: ["emails"], queryFn: () => api.get<Email[]>("/company/emails") });
  const [open, setOpen] = useState<Email | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
        <h2 className="font-semibold">Giden kutusu</h2>
        <p className="text-xs text-slate-500">Adaylara gönderilen tüm e-postalar. Önce kayda alınır, ardından kuyruktan gönderilir; hata olursa otomatik yeniden denenir.</p>
      </div>
      {isLoading ? <Skeleton className="m-5 h-60" /> : !data?.length ? <Empty icon={<Mail className="size-6" />} title="Henüz e-posta yok" text="Başvuru, mülakat ve sonuç e-postaları burada listelenir." /> : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {data.map((e) => (
            <li key={e.id}>
              <button onClick={() => setOpen(e)} className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <span className={clsx("size-2 shrink-0 rounded-full", e.status === "SENT" ? "bg-emerald-500" : e.status === "FAILED" ? "bg-rose-500" : "bg-amber-500")} title={e.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <p className="truncate text-xs text-slate-500">{e.to}{e.application ? ` · ${e.application.job.title}` : ""}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{relative(e.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject ?? ""} wide>
        <p className="mb-3 text-sm text-slate-500">Alıcı: {open?.to}</p>
        <pre className="rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 whitespace-pre-wrap dark:bg-white/[0.03]">{open?.body}</pre>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"company" | "team" | "outbox">("company");
  return (
    <>
      <PageHeader title="Ayarlar" actions={<Tabs value={tab} onChange={setTab} items={[{ value: "company", label: "Şirket" }, { value: "team", label: "Ekip" }, ...(can("OWNER", "RECRUITER") ? [{ value: "outbox" as const, label: "Giden kutusu" }] : [])]} />} />
      <div className="animate-fade-up">{tab === "company" ? <CompanyTab /> : tab === "team" ? <TeamTab /> : <OutboxTab />}</div>
    </>
  );
}
