"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register(form);
      toast.success("Hesabınız hazır! İlk ilanınızı oluşturalım.");
      router.replace("/panel/ilanlar/yeni");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-3xl font-semibold tracking-tight">Şirketinizi oluşturun</h1>
      <p className="mt-2 text-sm text-slate-500">Birkaç saniye sürer. Kredi kartı gerekmez.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Şirket adı" error={errors.companyName}>
          <input className="field h-11" value={form.companyName} onChange={set("companyName")} placeholder="Örn. Anadolu Lojistik" />
        </Field>
        <Field label="Adınız soyadınız" error={errors.name}>
          <input className="field h-11" value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        <Field label="İş e-postası" error={errors.email}>
          <input className="field h-11" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        <Field label="Şifre" error={errors.password} hint="En az 8 karakter">
          <input className="field h-11" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<ArrowRight className="size-4" />}>
          Hesap oluştur
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Zaten hesabınız var mı? <Link href="/giris" className="font-medium text-brand-600 hover:underline">Giriş yapın</Link>
      </p>
    </AuthShell>
  );
}
