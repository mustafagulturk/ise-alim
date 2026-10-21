"use client";

import { ArrowRight, Crown, Mic, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEMO = [
  { email: "demo@kadro.dev", label: "Yönetici", icon: Crown },
  { email: "ik@kadro.dev", label: "İK uzmanı", icon: UserCog },
  { email: "mulakat@kadro.dev", label: "Mülakatçı", icon: Mic },
];

function LoginForm() {
  const { login, me, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && me) router.replace("/panel");
  }, [ready, me, router]);
  useEffect(() => {
    if (params.get("oturum") === "bitti") toast.info("Oturumunuz sona erdi, tekrar giriş yapın.");
  }, [params]);

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(creds?.email ?? email, creds?.password ?? password);
      router.replace("/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Tekrar hoş geldin</h1>
      <p className="mt-2 text-sm text-slate-500">İşe alım panelinize giriş yapın.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="E-posta">
          <input className="field h-11" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@sirket.com" />
        </Field>
        <Field label="Şifre">
          <input className="field h-11" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="animate-[shake_0.4s] rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<ArrowRight className="size-4" />}>
          Giriş yap
        </Button>
      </form>

      <div className="mt-8">
        <p className="mb-3 text-center text-xs font-medium tracking-wide text-slate-400 uppercase">ya da demo hesabıyla dene</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.map(({ email: e, label, icon: Icon }) => (
            <button
              key={e}
              onClick={() => submit(undefined, { email: e, password: "Demo1234!" })}
              disabled={loading}
              className="card flex flex-col items-center gap-1.5 px-2 py-3 text-xs font-medium transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md disabled:opacity-50"
            >
              <Icon className="size-4 text-brand-500" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Şirketiniz için hesap yok mu?{" "}
        <Link href="/kayit" className="font-medium text-brand-600 hover:underline">Ücretsiz başlayın</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
