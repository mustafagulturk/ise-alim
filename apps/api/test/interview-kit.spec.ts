import type { Analysis, ScoredRequirement } from "../src/ai/analysis";
import { bankKey, type KitInput, localKit, questionCount } from "../src/ai/interview-kit";

const reqs: ScoredRequirement[] = [
  { id: "r1", text: "En az 5 yıl backend deneyimi", keywords: ["backend"], weight: 5, mustHave: true, verdict: "met", evidence: "Yaklaşık 7 yıl deneyim." },
  { id: "r2", text: "PostgreSQL ile ileri seviye deneyim", keywords: ["postgresql"], weight: 4, mustHave: false, verdict: "partial", evidence: '"Postgres kullandım"' },
  { id: "r3", text: "Kubernetes bilgisi", keywords: ["kubernetes"], weight: 3, mustHave: true, verdict: "missing", evidence: "Kanıt yok." },
  { id: "r4", text: "Takım liderliği", keywords: ["liderlik"], weight: 2, mustHave: false, verdict: "met", evidence: '"4 kişilik ekibi yönettim"' },
];

const input = (over: Partial<KitInput> = {}): KitInput => ({
  jobTitle: "Backend Geliştirici",
  interviewTitle: "Teknik mülakat",
  durationMin: 60,
  analysis: { requirements: reqs, summary: "", concerns: [] } as unknown as Analysis,
  requirements: reqs,
  previousNotes: [],
  cvText: "",
  ...over,
});

describe("mülakat kiti (yerel)", () => {
  it("soru sayısını mülakat süresine göre ayarlar", () => {
    expect(questionCount(30)).toBe(4);
    expect(questionCount(60)).toBe(6);
    expect(questionCount(240)).toBe(8);
    expect(localKit(input({ durationMin: 30 })).questions).toHaveLength(4);
  });

  it("önce zorunlu eksiği, sonra kısmi kriteri sorar ve beceri bankasını kullanır", () => {
    const kit = localKit(input());
    expect(kit.questions[0].requirementId).toBe("r3");
    expect(kit.questions[0].why).toMatch(/Zorunlu/);
    expect(kit.questions[1].requirementId).toBe("r2");
    expect(kit.questions[1].question).toMatch(/sorgu/i);
    expect(kit.questions.at(-1)!.topic).toBe("Motivasyon");
    expect(kit.focus).toMatch(/Kubernetes/);
    for (const q of kit.questions) {
      expect(q.goodSigns.length).toBeGreaterThan(0);
      expect(q.redFlags.length).toBeGreaterThan(0);
    }
  });

  it("kültür mülakatında davranışsal sorular ekler, önceki şüpheyi odağa taşır", () => {
    const kit = localKit(input({ interviewTitle: "Kültür ve tanışma", previousNotes: [{ interview: "Teknik mülakat", recommendation: "NO", notes: "Sistem tasarımında zayıf" }] }));
    expect(kit.questions.some((q) => q.topic === "Takım çalışması")).toBe(true);
    expect(kit.focus).toMatch(/Önceki mülakatta şüphe/);
  });

  it("kriteri beceri bankasıyla eşleştirir", () => {
    expect(bankKey({ text: "PostgreSQL ile ileri seviye deneyim", keywords: [] })).toBe("sql");
    expect(bankKey({ text: "Kubernetes bilgisi", keywords: ["k8s"] })).toBe("docker");
    expect(bankKey({ text: "Güçlü iletişim becerisi", keywords: ["iletisim"] })).toBeNull();
  });
});
