import { computeScore, MUST_HAVE_CAP, type AiAssessment, type JobInput } from "../src/ai/analysis";
import { anonymize } from "../src/ai/anonymize";
import { experienceYears } from "../src/ai/experience";
import { localAssess } from "../src/ai/local-scorer";
import { keywordsFrom, norm } from "../src/ai/text";
import { rankBetween, slugify } from "../src/common/util";

const job: JobInput = {
  title: "Backend Geliştirici",
  department: "Mühendislik",
  description: "",
  requirements: [
    { id: "r1", text: "En az 5 yıl backend deneyimi", keywords: ["backend", "yazılım"], weight: 5, mustHave: true },
    { id: "r2", text: "Node.js ve TypeScript", keywords: ["node.js", "typescript"], weight: 4, mustHave: false },
    { id: "r3", text: "PostgreSQL", keywords: ["postgresql"], weight: 3, mustHave: false },
    { id: "r4", text: "Kubernetes", keywords: ["kubernetes"], weight: 2, mustHave: false },
  ],
};

const cv = `Ayşe Yılmaz
ayse@ornek.com · 0 532 111 22 33
İŞ DENEYİMİ
Kıdemli Backend Geliştirici · Örnek A.Ş.   03/2019 - Halen
• Node.js ve TypeScript ile ödeme servislerini geliştirdim
• Postgres sorgularını optimize ettim
Yazılım Geliştirici · Başka Ltd.   01/2016 - 02/2019
• Express ile REST API'ler yazdım
EĞİTİM
Lisans, Bilgisayar Mühendisliği, Ege Üniversitesi (2011 - 2015)`;

describe("puan formülü", () => {
  const all = (verdict: "met" | "partial" | "missing"): AiAssessment => ({
    summary: "", strengths: [], concerns: [], interviewQuestions: [], experienceYears: null, skills: [],
    requirements: job.requirements.map((r) => ({ id: r.id, verdict, evidence: "" })),
  });

  it("tüm kriterler karşılanınca 100, hiçbiri karşılanmayınca 0 verir", () => {
    expect(computeScore(job.requirements, all("met")).score).toBe(100);
    expect(computeScore(job.requirements, all("missing")).score).toBe(0);
    expect(computeScore(job.requirements, all("partial")).score).toBe(50);
  });

  it("zorunlu kriter eksikse puanı sınırlar", () => {
    const a = all("met");
    a.requirements[0].verdict = "missing";
    const r = computeScore(job.requirements, a);
    expect(r.score).toBe(MUST_HAVE_CAP);
    expect(r.mustHaveMissing).toEqual(["En az 5 yıl backend deneyimi"]);
  });

  it("modelin atladığı kriteri eksik sayar", () => {
    const a = all("met");
    a.requirements = a.requirements.filter((r) => r.id !== "r4");
    expect(computeScore(job.requirements, a).scored.find((r) => r.id === "r4")?.verdict).toBe("missing");
  });
});

describe("yerel puanlayıcı", () => {
  it("eş anlamlıları ve deneyim yılını tanır, kanıt alıntılar", () => {
    const a = localAssess(job, cv, );
    const by = Object.fromEntries(a.requirements.map((r) => [r.id, r]));
    expect(by.r1.verdict).toBe("met");
    expect(by.r2.verdict).toBe("met");
    expect(by.r2.evidence).toContain("Node.js ve TypeScript");
    expect(by.r3.verdict).toBe("met"); // "Postgres" -> PostgreSQL eş anlamlısı
    expect(by.r4.verdict).toBe("missing");
    expect(a.interviewQuestions.length).toBeGreaterThan(0);
  });

  it("deneyim yetersizse süre kriterini kısmen sayar", () => {
    const junior = cv.replace("01/2016 - 02/2019", "").replace("03/2019", "03/2024");
    const a = localAssess(job, junior);
    expect(a.requirements.find((r) => r.id === "r1")?.verdict).not.toBe("met");
  });
});

describe("deneyim hesabı", () => {
  it("tarih aralıklarını toplar, eğitimi saymaz", () => {
    const years = experienceYears(cv, new Date("2026-10-01"));
    expect(years).toBeGreaterThan(10);
    expect(years).toBeLessThan(11);
  });

  it("çakışan aralıkları birleştirir", () => {
    expect(experienceYears("2018 - 2020\n2019 - 2021", new Date("2026-01-01"))).toBe(4);
  });
});

describe("KVKK maskeleme", () => {
  it("ad, e-posta ve telefonu gizler", () => {
    const out = anonymize(cv, "Ayşe Yılmaz");
    expect(out).not.toContain("ayse@ornek.com");
    expect(out).not.toContain("532 111");
    expect(out).not.toContain("Ayşe");
    expect(out).toContain("[E-POSTA]");
    expect(out).toContain("[TELEFON]");
  });
});

describe("yardımcılar", () => {
  it("Türkçe karakterleri normalleştirir", () => {
    expect(norm("İŞ Güvenliği ÇALIŞMASI")).toBe("is guvenligi calismasi");
    expect(slugify("Kıdemli Backend Geliştirici (Node.js)")).toBe("kidemli-backend-gelistirici-nodejs");
  });

  it("gereksinimden anlamlı anahtar kelime çıkarır", () => {
    expect(keywordsFrom("En az 3 yıl React deneyimi")).toEqual(["react"]);
  });

  it("kanban sırası iki kart arasına yerleşir", () => {
    expect(rankBetween(1000, 2000)).toBe(1500);
    expect(rankBetween(null, 1000)).toBe(0);
    expect(rankBetween(3000, null)).toBe(4000);
  });
});
