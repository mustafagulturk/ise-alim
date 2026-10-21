import { ArrowRight, Bot, CalendarClock, Columns3, EyeOff, FileSearch, Code2, Radio, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { Logo, ScoreRing, ThemeToggle } from "@/components/ui";

const FEATURES = [
  { icon: Bot, title: "Kanıta dayalı yapay zekâ puanı", text: "Claude her CV'yi ilanınızdaki kriterlerle tek tek karşılaştırır ve her karar için CV'den alıntı gösterir. Puan, kriter ağırlıklarından şeffaf şekilde hesaplanır." },
  { icon: ShieldCheck, title: "KVKK uyumlu maskeleme", text: "Ad, e-posta, telefon ve doğum tarihi modele gönderilmeden önce maskelenir. Değerlendirme yalnızca yetkinliğe dayanır." },
  { icon: Columns3, title: "Sürükle-bırak aday hattı", text: "Adayları aşamalar arasında taşıyın, toplu eleyin, nazik ret e-postasını tek tıkla gönderin." },
  { icon: Radio, title: "Canlı ekip çalışması", text: "Yeni başvuru geldiğinde ya da bir ekip arkadaşınız kart taşıdığında panel anında güncellenir." },
  { icon: EyeOff, title: "Kör değerlendirme", text: "Tek tuşla aday adlarını ve iletişim bilgilerini gizleyin; ekip önyargısız karar versin." },
  { icon: FileSearch, title: "CV'lerde Türkçe arama", text: '"kubernetes" ya da "takım lideri" yazın, kelimenin geçtiği tüm CV\'leri vurgulu alıntılarla bulun.' },
  { icon: CalendarClock, title: "Mülakat ve değerlendirme formu", text: "Mülakat planlayın, takvime ekleyin; her mülakatçı diğerlerini görmeden kendi formunu doldursun." },
  { icon: Wand2, title: "Kriterleri yapay zekâ önersin", text: "İlan metnini yazın, değerlendirme kriterleri ağırlıklarıyla birlikte otomatik çıkarılsın." },
];

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/kariyer/lumen" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 sm:block dark:text-slate-300">Örnek kariyer sayfası</Link>
          <Link href="/giris" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">Giriş yap</Link>
        </nav>
      </header>

      <section className="relative">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-24 text-center">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 backdrop-blur dark:border-brand-500/30 dark:bg-white/5 dark:text-brand-300">
            <Sparkles className="size-3.5" /> Claude ile çalışan açık kaynak işe alım platformu
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl animate-fade-up text-5xl leading-[1.05] font-semibold tracking-tight [animation-delay:60ms] sm:text-7xl">
            Doğru adayı <span className="text-gradient">yüzlerce CV'nin</span> içinden saniyeler içinde bulun
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-slate-600 [animation-delay:120ms] dark:text-slate-300">
            İlanınızı yayınlayın, kariyer sayfanızdan başvuruları toplayın. Kadro her CV'yi kriterlerinize göre kanıtlarıyla puanlasın, ekibiniz kanban üzerinde birlikte karar versin.
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:180ms]">
            <Link href="/giris" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-700 px-6 font-medium text-white shadow-[0_10px_30px_-10px_rgb(109_40_217/0.8)] transition hover:brightness-110">
              Demoyu dene <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a href="https://github.com/mustafagulturk/ise-alim" target="_blank" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-medium transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5">
              <Code2 className="size-4" /> Kaynak kod
            </a>
          </div>

          <div className="relative mx-auto mt-16 max-w-4xl animate-fade-up [animation-delay:240ms]">
            <div className="card grid gap-3 p-4 text-left shadow-2xl shadow-brand-900/10 sm:grid-cols-3 dark:bg-[#12121c]">
              {[
                { stage: "Yeni başvuru", dot: "bg-sky-500", people: [["Deniz Kaya", "Node.js · 6 yıl", 84], ["Can Polat", "Java · 4 yıl", 58]] },
                { stage: "Mülakat", dot: "bg-amber-500", people: [["Selin Aksoy", "TypeScript · 8 yıl", 92], ["Mert Kurt", "Go · 5 yıl", 77]] },
                { stage: "Teklif", dot: "bg-fuchsia-500", people: [["Ece Tekin", "Node.js · 9 yıl", 96]] },
              ].map((col, ci) => (
                <div key={col.stage} className="rounded-xl bg-slate-50 p-2.5 dark:bg-white/[0.03]">
                  <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold"><span className={`size-2 rounded-full ${col.dot}`} />{col.stage}</p>
                  <div className="space-y-2">
                    {col.people.map(([n, s, sc], i) => (
                      <div key={String(n)} className="flex animate-fade-up items-center gap-2.5 rounded-lg bg-white p-2.5 shadow-sm dark:bg-white/5" style={{ animationDelay: `${400 + ci * 120 + i * 80}ms` }}>
                        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white">{String(n).split(" ").map((p) => p[0]).join("")}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{n}</p><p className="truncate text-[11px] text-slate-500">{s}</p></div>
                        <ScoreRing score={Number(sc)} size={32} stroke={3} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Bir işe alım ekibinin ihtiyacı olan her şey</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">İlan, başvuru, değerlendirme, mülakat ve raporlama tek yerde.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card group p-5 transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500/15 to-fuchsia-500/10 text-brand-600 transition group-hover:scale-110 dark:text-brand-300"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-[#0f0f1a] px-8 py-14 text-center text-white">
          <div className="absolute -top-24 left-1/4 size-80 rounded-full bg-brand-600/40 blur-[100px]" />
          <div className="absolute right-0 -bottom-24 size-80 rounded-full bg-fuchsia-500/30 blur-[100px]" />
          <h2 className="relative text-3xl font-semibold tracking-tight">Hazır demo verisiyle hemen deneyin</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-slate-400">5 açık ilan, 46 aday ve gerçek PDF CV'ler. Yönetici, İK uzmanı ya da mülakatçı olarak giriş yapın.</p>
          <Link href="/giris" className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-slate-900 transition hover:bg-slate-100">Panele gir <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-white/10">
        Kadro · Mustafa Gültürk tarafından geliştirildi · <a href="https://github.com/mustafagulturk" className="hover:text-slate-900 dark:hover:text-white">GitHub</a>
      </footer>
    </div>
  );
}
