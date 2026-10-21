import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 text-7xl font-semibold text-gradient">404</p>
        <p className="mt-3 text-lg font-medium">Aradığınız sayfa bulunamadı</p>
        <p className="mt-1 text-slate-500">İlan yayından kaldırılmış ya da bağlantı hatalı olabilir.</p>
        <Link href="/" className="mt-8 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900">Ana sayfa</Link>
      </div>
    </div>
  );
}
