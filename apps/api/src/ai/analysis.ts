import { z } from "zod";

/** Modelden (ya da yerel puanlayıcıdan) beklenen değerlendirme. Puanı model değil, aşağıdaki formül hesaplar. */
export const AiAssessment = z.object({
  summary: z.string().describe("Adayın bu ilana uygunluğunu 2-3 cümlede özetle."),
  requirements: z
    .array(
      z.object({
        id: z.string().describe("Gereksinimin kimliği, verilen listeden aynen kopyala."),
        verdict: z.enum(["met", "partial", "missing"]),
        evidence: z.string().describe("CV'den kısa alıntı ya da kanıt yoksa nedenini açıkla."),
      }),
    )
    .describe("Verilen her gereksinim için tam olarak bir kayıt."),
  strengths: z.array(z.string()).describe("En fazla 4 güçlü yan."),
  concerns: z.array(z.string()).describe("En fazla 4 risk ya da eksik."),
  interviewQuestions: z.array(z.string()).describe("Mülakatta eksikleri ve iddiaları doğrulayacak 4-5 soru."),
  experienceYears: z.number().nullable().describe("Toplam profesyonel deneyim yılı, belirsizse null."),
  skills: z.array(z.string()).describe("CV'de geçen teknik beceriler, en fazla 15."),
});

export type AiAssessment = z.infer<typeof AiAssessment>;
export type Verdict = AiAssessment["requirements"][number]["verdict"];

export interface ReqInput {
  id: string;
  text: string;
  keywords: string[];
  weight: number;
  mustHave: boolean;
}

export interface JobInput {
  title: string;
  department: string;
  description: string;
  requirements: ReqInput[];
}

export interface ScoredRequirement extends ReqInput {
  verdict: Verdict;
  evidence: string;
}

export interface Analysis extends Omit<AiAssessment, "requirements"> {
  score: number;
  mustHaveMissing: string[];
  requirements: ScoredRequirement[];
  provider: "claude" | "local";
  model?: string;
  durationMs: number;
}

const POINTS: Record<Verdict, number> = { met: 1, partial: 0.5, missing: 0 };

/** Zorunlu bir gereksinim karşılanmıyorsa puan bu değerin üstüne çıkamaz. */
export const MUST_HAVE_CAP = 35;

/**
 * Ağırlıklı puan: her gereksinim ağırlığı kadar katkı yapar (karşılandı 1, kısmen 0,5).
 * Böylece puan her zaman açıklanabilir: hangi maddeden kaç puan geldiği görülebilir.
 */
export function computeScore(reqs: ReqInput[], assessment: AiAssessment) {
  const byId = new Map(assessment.requirements.map((r) => [r.id, r]));
  const scored: ScoredRequirement[] = reqs.map((r) => {
    const a = byId.get(r.id);
    return { ...r, verdict: a?.verdict ?? "missing", evidence: a?.evidence ?? "Değerlendirilmedi." };
  });
  const total = scored.reduce((s, r) => s + r.weight, 0) || 1;
  let score = Math.round((scored.reduce((s, r) => s + r.weight * POINTS[r.verdict], 0) / total) * 100);
  const mustHaveMissing = scored.filter((r) => r.mustHave && r.verdict === "missing").map((r) => r.text);
  if (mustHaveMissing.length) score = Math.min(score, MUST_HAVE_CAP);
  return { score, scored, mustHaveMissing };
}
