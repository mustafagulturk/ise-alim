import type { AiAssessment, JobInput, ReqInput, Verdict } from "./analysis";
import { experienceYears } from "./experience";
import { keywordsFrom, norm, sentences } from "./text";

/** Bilinen beceriler ve eş anlamlıları: CV'de hangisi geçerse geçsin aynı beceri sayılır. */
export const SYNONYMS: Record<string, string[]> = {
  javascript: ["javascript", "js", "ecmascript", "es6"],
  typescript: ["typescript", "ts"],
  react: ["react", "react.js", "reactjs", "next.js", "nextjs"],
  "node.js": ["node.js", "nodejs", "node", "express", "nestjs"],
  nestjs: ["nestjs", "nest.js"],
  "c#": ["c#", "csharp", ".net", "asp.net", "dotnet"],
  ".net": [".net", "asp.net", "dotnet", "c#", "entity framework"],
  java: ["java", "spring", "spring boot"],
  python: ["python", "django", "fastapi", "flask", "pandas"],
  sql: ["sql", "postgresql", "postgres", "mysql", "mssql", "t-sql", "oracle", "sqlite"],
  postgresql: ["postgresql", "postgres"],
  docker: ["docker", "container", "konteyner", "kubernetes", "k8s"],
  kubernetes: ["kubernetes", "k8s", "helm"],
  aws: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  azure: ["azure"],
  git: ["git", "github", "gitlab", "bitbucket"],
  "ci/cd": ["ci/cd", "github actions", "jenkins", "gitlab ci", "azure devops", "pipeline"],
  test: ["test", "jest", "unit test", "birim test", "xunit", "cypress", "playwright", "tdd"],
  ingilizce: ["ingilizce", "english", "ielts", "toefl", "yds", "b2", "c1"],
  figma: ["figma", "sketch", "adobe xd"],
  excel: ["excel", "pivot", "vlookup", "dusey ara", "power bi"],
  sap: ["sap", "erp", "logo", "netsis", "mikro"],
  muhasebe: ["muhasebe", "on muhasebe", "bilanco", "e-fatura", "vergi", "beyanname"],
  satis: ["satis", "musteri", "crm", "b2b", "hedef", "portfoy"],
  "ui/ux": ["ui/ux", "ux", "ui", "kullanici deneyimi", "arayuz tasarimi", "wireframe", "prototip"],
  mobil: ["mobil", "react native", "flutter", "swift", "kotlin", "android", "ios"],
  redis: ["redis", "onbellek", "cache"],
  mikroservis: ["mikroservis", "microservice", "rabbitmq", "kafka", "event-driven"],
  agile: ["agile", "scrum", "kanban", "jira", "cevik"],
  liderlik: ["liderlik", "ekip lideri", "takim lideri", "mentorluk", "team lead", "yonetti"],
};

const SKILL_NAMES: Record<string, string> = {
  javascript: "JavaScript", typescript: "TypeScript", react: "React", "node.js": "Node.js", nestjs: "NestJS",
  "c#": "C#", ".net": ".NET", java: "Java", python: "Python", sql: "SQL", postgresql: "PostgreSQL",
  docker: "Docker", kubernetes: "Kubernetes", aws: "AWS", azure: "Azure", git: "Git", "ci/cd": "CI/CD",
  test: "Otomatik test", ingilizce: "İngilizce", figma: "Figma", excel: "Excel", sap: "ERP", muhasebe: "Muhasebe",
  satis: "Satış", "ui/ux": "UI/UX", mobil: "Mobil", redis: "Redis", mikroservis: "Mikroservis", agile: "Agile/Scrum",
  liderlik: "Liderlik",
};

export function variants(keyword: string) {
  const k = norm(keyword);
  return SYNONYMS[k] ?? [k];
}

/**
 * Kelime başından eşleştirir. Türkçe eklemeli bir dil olduğu için uzun kelimelerde ek serbest
 * ("geliştirme" -> "geliştirmeye"), kısa kısaltmalarda (js, ui) tam kelime aranır.
 */
export function contains(haystack: string, needle: string) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = /^[a-z]{4,}$/.test(needle) ? "" : "($|[^a-z0-9#+])";
  return new RegExp(`(^|[^a-z0-9#+])${escaped}${tail}`).test(haystack);
}

function trim(s: string, max = 160) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function yearsRequired(text: string) {
  const m = norm(text).match(/(\d{1,2})\s*\+?\s*(?:yil|years?)/);
  return m ? Number(m[1]) : null;
}

function judge(req: ReqInput, cvNorm: string, lines: string[], linesNorm: string[], years: number | null) {
  const keywords = req.keywords.length ? req.keywords : keywordsFrom(req.text);
  const minYears = yearsRequired(req.text);

  const hits = keywords.filter((k) => variants(k).some((v) => contains(cvNorm, v)));
  const ratio = keywords.length ? hits.length / keywords.length : 0;
  // Süre içeren kriterlerde kelimeler yalnızca alanı belirler (ör. "5 yıl backend"); asıl ölçüt deneyim yılıdır.
  let verdict: Verdict = minYears != null ? (hits.length ? "met" : "missing") : ratio >= 0.6 ? "met" : ratio > 0 ? "partial" : "missing";

  let evidence = "CV'de bu konuya dair bir ifade bulunamadı.";
  if (hits.length) {
    const vs = hits.flatMap(variants);
    const i = linesNorm.findIndex((l) => vs.some((v) => contains(l, v)));
    if (i >= 0) evidence = `"${trim(lines[i])}"`;
  }

  if (minYears != null) {
    if (years == null) {
      if (verdict === "met") verdict = "partial";
      evidence += ` Toplam deneyim süresi CV'den çıkarılamadı (beklenen ${minYears}+ yıl).`;
    } else if (years < minYears) {
      if (!keywords.length) verdict = years >= minYears * 0.6 ? "partial" : "missing";
      else if (verdict === "met") verdict = "partial";
      evidence += ` Yaklaşık ${years} yıl deneyim var, beklenen ${minYears}+ yıl.`;
    } else if (!keywords.length) {
      verdict = "met";
      evidence = `Yaklaşık ${years} yıl profesyonel deneyim.`;
    } else {
      evidence = `Yaklaşık ${years} yıl deneyim. ${evidence}`;
    }
  }
  return { id: req.id, verdict, evidence };
}

/**
 * API anahtarı yokken (ya da model hata verdiğinde) çalışan kural tabanlı değerlendirici.
 * Anahtar kelime + eş anlamlı eşleşmesi, tarih aralıklarından deneyim yılı ve cümle bazlı kanıt üretir.
 * Claude kadar akıllı değildir ama aynı şemayı döndürür, böylece arayüz iki durumda da aynı çalışır.
 */
export function localAssess(job: JobInput, cvText: string): AiAssessment {
  const cvNorm = norm(cvText);
  const lines = sentences(cvText);
  const linesNorm = lines.map(norm);
  const years = experienceYears(cvText);

  const requirements = job.requirements.map((r) => judge(r, cvNorm, lines, linesNorm, years));
  const byId = new Map(job.requirements.map((r) => [r.id, r]));
  const met = requirements.filter((r) => r.verdict === "met").map((r) => byId.get(r.id)!);
  const partial = requirements.filter((r) => r.verdict === "partial").map((r) => byId.get(r.id)!);
  const missing = requirements.filter((r) => r.verdict === "missing").map((r) => byId.get(r.id)!);

  const skills = Object.keys(SYNONYMS)
    .filter((k) => SYNONYMS[k].some((v) => contains(cvNorm, v)))
    .map((k) => SKILL_NAMES[k] ?? k)
    .slice(0, 15);

  const strengths = [...met]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((r) => `${r.text}: CV'de açıkça yer alıyor.`);
  if (years != null && years >= 5) strengths.push(`Yaklaşık ${years} yıllık profesyonel deneyim.`);

  const concerns = [
    ...missing.filter((r) => r.mustHave).map((r) => `Zorunlu kriter karşılanmıyor: ${r.text}.`),
    ...missing.filter((r) => !r.mustHave).slice(0, 2).map((r) => `${r.text} konusunda kanıt yok.`),
    ...partial.slice(0, 2).map((r) => `${r.text} kısmen karşılanıyor, mülakatta derinleştirilmeli.`),
  ].slice(0, 4);
  if (cvText.trim().length < 300) concerns.unshift("CV metni çok kısa ya da okunamadı; dosyayı elle kontrol edin.");

  const interviewQuestions = [
    ...[...missing, ...partial].slice(0, 3).map((r) => `"${r.text}" konusunda yaşadığınız somut bir örneği anlatır mısınız?`),
    ...met.slice(0, 2).map((r) => `${r.text} ile ilgili en zorlandığınız projede sizin rolünüz neydi, nasıl çözdünüz?`),
    `Neden ${job.title} pozisyonu ve neden şimdi?`,
  ].slice(0, 5);

  const total = job.requirements.length;
  const summary =
    total === 0
      ? "İlan için değerlendirme kriteri tanımlanmamış."
      : `${total} kriterin ${met.length} tanesi karşılanıyor, ${partial.length} tanesi kısmen.` +
        (missing.some((r) => r.mustHave) ? " Zorunlu kriterlerden en az biri eksik." : "") +
        (years != null ? ` CV'ye göre yaklaşık ${years} yıl deneyim.` : "") +
        (skills.length ? ` Öne çıkan beceriler: ${skills.slice(0, 4).join(", ")}.` : "");

  return { summary, requirements, strengths, concerns, interviewQuestions, experienceYears: years, skills };
}
