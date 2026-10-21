import type { JobStatus, Recommendation, Role, Stage, WorkType } from "./types";

export const STAGES: Stage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export const stageMeta: Record<Stage, { label: string; dot: string; soft: string }> = {
  APPLIED: { label: "Yeni başvuru", dot: "bg-sky-500", soft: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20" },
  SCREENING: { label: "Ön değerlendirme", dot: "bg-violet-500", soft: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20" },
  INTERVIEW: { label: "Mülakat", dot: "bg-amber-500", soft: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" },
  OFFER: { label: "Teklif", dot: "bg-fuchsia-500", soft: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20" },
  HIRED: { label: "İşe alındı", dot: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" },
  REJECTED: { label: "Elendi", dot: "bg-slate-400", soft: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10" },
};

export const jobStatusMeta: Record<JobStatus, { label: string; cls: string }> = {
  OPEN: { label: "Yayında", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" },
  DRAFT: { label: "Taslak", cls: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10" },
  CLOSED: { label: "Kapandı", cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20" },
};

export const workTypeLabel: Record<WorkType, string> = { ONSITE: "Ofisten", HYBRID: "Hibrit", REMOTE: "Uzaktan" };
export const roleLabel: Record<Role, string> = { OWNER: "Yönetici", RECRUITER: "İK uzmanı", INTERVIEWER: "Mülakatçı" };
export const recLabel: Record<Recommendation, { label: string; cls: string }> = {
  STRONG_YES: { label: "Kesinlikle evet", cls: "text-emerald-600 dark:text-emerald-400" },
  YES: { label: "Evet", cls: "text-emerald-600 dark:text-emerald-400" },
  NO: { label: "Hayır", cls: "text-rose-600 dark:text-rose-400" },
  STRONG_NO: { label: "Kesinlikle hayır", cls: "text-rose-600 dark:text-rose-400" },
};

const dtf = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
const dtt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const wk = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

export const date = (d: string | Date) => dtf.format(new Date(d));
export const dateTime = (d: string | Date) => dtt.format(new Date(d));
export const longDay = (d: string | Date) => wk.format(new Date(d));
export const time = (d: string | Date) => new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function relative(d: string | Date) {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "az önce";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return date(d);
}

export const money = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr"))
    .join("");
}

/** Kör değerlendirme modunda ad yerine sabit bir takma ad gösterilir (aynı aday hep aynı takma adı alır). */
export function alias(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `Aday #${(h % 9000) + 1000}`;
}

export function scoreTone(score: number | null) {
  if (score == null) return { text: "text-slate-400", bg: "bg-slate-100 dark:bg-white/5", ring: "#94a3b8", label: "—" };
  if (score >= 75) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "#10b981", label: "Güçlü" };
  if (score >= 50) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", ring: "#f59e0b", label: "Orta" };
  return { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", ring: "#f43f5e", label: "Zayıf" };
}
