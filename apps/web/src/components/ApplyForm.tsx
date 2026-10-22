"use client";

import { clsx } from "clsx";
import { CheckCircle2, Copy, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

const MAX = 5 * 1024 * 1024;

export function ApplyForm({ slug, jobSlug, color, company }: { slug: string; jobSlug: string; color: string; company: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function pick(f?: File) {
    if (!f) return;
    if (f.size > MAX) return setErrors((e) => ({ ...e, cv: "Dosya en fazla 5 MB olabilir." }));
    if (!/\.(pdf|docx)$/i.test(f.name)) return setErrors((e) => ({ ...e, cv: "PDF ya da Word (.docx) yükleyin." }));
    setErrors(({ cv: _, ...rest }) => rest);
    setFile(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (file) data.set("cv", file);
    data.set("kvkk", data.get("kvkk") ? "true" : "false");
    data.set("pool", data.get("pool") ? "true" : "false");
    const ref = new URLSearchParams(location.search).get("kaynak");
    if (ref) data.set("source", ref);
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`/api/careers/${slug}/jobs/${jobSlug}/apply`, { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.fields ?? {});
        toast.error(Array.isArray(body.message) ? body.message[0] : body.message);
        return;
      }
      setDone(body.trackingToken);
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    const url = `${location.origin}/basvuru/${done}`;
    return (
      <div className="card animate-pop p-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Başvurunuz alındı!</h2>
        <p className="mt-2 text-sm text-slate-500">{company} ekibi başvurunuzu inceleyecek. Durumunu aşağıdaki bağlantıdan dilediğiniz zaman takip edebilirsiniz; bağlantı e-postanıza da gönderildi.</p>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-left dark:bg-white/5">
          <span className="min-w-0 flex-1 truncate px-2 font-mono text-xs">{url}</span>
          <button onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Kopyalandı"))} className="rounded-lg p-2 hover:bg-white dark:hover:bg-white/10" aria-label="Kopyala"><Copy className="size-4" /></button>
        </div>
        <Link href={`/basvuru/${done}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl font-medium text-white" style={{ background: color }}>Başvurumu takip et</Link>
      </div>
    );
  }

  const field = "field h-11";
  return (
    <form onSubmit={submit} className="card space-y-4 p-6 animate-fade-up [animation-delay:100ms]" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Hemen başvur</h2>
        <p className="text-sm text-slate-500">Yaklaşık 1 dakika sürer.</p>
      </div>
      <Input name="name" label="Ad soyad *" error={errors.name} className={field} autoComplete="name" />
      <Input name="email" label="E-posta *" error={errors.email} className={field} type="email" autoComplete="email" />
      <div className="grid grid-cols-2 gap-3">
        <Input name="phone" label="Telefon" error={errors.phone} className={field} type="tel" autoComplete="tel" />
        <Input name="city" label="Şehir" error={errors.city} className={field} />
      </div>
      <Input name="linkedin" label="LinkedIn / portfolyo" error={errors.linkedin} className={field} placeholder="https://" />

      <div>
        <span className="mb-1.5 block text-sm font-medium">CV *</span>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          onClick={() => input.current?.click()}
          className={clsx(
            "group grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
            drag ? "scale-[1.02] border-current bg-slate-50 dark:bg-white/5" : errors.cv ? "border-rose-300" : "border-slate-200 hover:border-slate-400 dark:border-white/10",
          )}
          style={drag ? { color } : undefined}
        >
          <input ref={input} type="file" accept=".pdf,.docx" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          {file ? (
            <div className="flex w-full items-center gap-3 text-left">
              <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: color }}><FileText className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p></div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Kaldır"><X className="size-4" /></button>
            </div>
          ) : (
            <>
              <UploadCloud className={clsx("size-8 text-slate-400 transition group-hover:-translate-y-0.5", drag && "animate-bounce")} />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Sürükleyin ya da seçin</p>
              <p className="text-xs text-slate-500">PDF veya DOCX, en fazla 5 MB</p>
            </>
          )}
        </div>
        {errors.cv && <p className="mt-1 text-xs text-rose-600">{errors.cv}</p>}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Ön yazı <span className="font-normal text-slate-400">(isteğe bağlı)</span></span>
        <textarea name="coverLetter" className="field min-h-24" maxLength={3000} placeholder="Neden bu pozisyon?" />
      </label>

      <label className={clsx("flex items-start gap-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300", errors.kvkk && "text-rose-600")}>
        <input type="checkbox" name="kvkk" className="mt-1" style={{ accentColor: color }} />
        <span>Kişisel verilerimin işe alım süreci kapsamında işlenmesine ve CV'min yapay zekâ destekli araçlarla, kimlik bilgilerim maskelenerek ön değerlendirmeden geçirilmesine izin veriyorum (KVKK aydınlatma metni).</span>
      </label>
      <label className="-mt-2 flex items-start gap-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
        <input type="checkbox" name="pool" className="mt-1" style={{ accentColor: color }} />
        <span>İsteğe bağlı: Bu pozisyon olmasa da başvurumun ileride açılacak uygun pozisyonlar için değerlendirilmesini istiyorum. Onayımı başvuru takip sayfasından dilediğim zaman geri çekebilirim.</span>
      </label>

      <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-medium text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60" style={{ background: color, boxShadow: `0 10px 24px -10px ${color}` }}>
        {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-4" />}
        Başvuruyu gönder
      </button>
    </form>
  );
}

function Input({ label, error, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...rest} className={clsx(rest.className, error && "border-rose-300")} />
      {error && <span className="block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
