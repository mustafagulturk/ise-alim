/**
 * Demo verisi: "Lumen Teknoloji" adlı kurgusal şirket, 6 ilan ve PDF CV'leriyle 46 aday.
 * CV'ler pdfkit ile üretilir, gerçek akıştaki gibi metne çevrilip puanlanır.
 * Çalıştırma: npm run db:seed (veritabanını sıfırlar).
 */
import "reflect-metadata";
import { type Prisma, PrismaClient, type Stage } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { Analysis } from "../src/ai/analysis";
import { extractText } from "../src/ai/cv-text";
import { localKit } from "../src/ai/interview-kit";
import { keywordsFrom } from "../src/ai/text";
import { ScoringService } from "../src/ai/scoring.service";
import { furthest } from "../src/applications/stages";
import { StorageService } from "../src/common/storage.service";
import { token } from "../src/common/util";
import { TEMPLATES, render } from "../src/emails/templates";
import { freeSlots, spread } from "../src/interviews/availability";
import { renderCv, type CvData } from "./seed/cv-pdf";
import { CITIES, FIRST, LAST, ROLES, SCHOOLS, SOURCES, type RoleProfile } from "./seed/data";

const prisma = new PrismaClient();
const storage = new StorageService();
const scoring = new ScoringService();

// Her çalıştırmada aynı veri oluşsun diye sabit tohumlu rastgele sayı üreteci.
let seed = 20261021;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const DAY = 86400_000;
const NOW = Date.now();
const ago = (days: number, hour = 9 + Math.floor(rnd() * 9)) => {
  const d = new Date(NOW - days * DAY);
  d.setHours(hour, Math.floor(rnd() * 60), 0, 0);
  return d;
};
const ascii = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]!);
const mmYYYY = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const usedNames = new Set<string>();
function personName() {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
}

function buildCv(role: RoleProfile, quality: number): CvData & { years: number } {
  const name = personName();
  const [first, last] = name.split(" ");
  const years = Math.max(1, Math.round((0.6 + quality * 7.5 + (rnd() - 0.5) * 2.5) * 10) / 10);
  const title = pick(role.titles);

  const skills = role.skills.filter((_, i) => rnd() < Math.min(0.92, 0.08 + quality * 0.85 - i * 0.06));
  // Adayların bir kısmı full stack: diğer rolün becerilerini de taşır.
  if (role.crossover && rnd() < 0.2 + quality * 0.5) skills.push(...role.crossover.filter((_, i) => i === 0 || rnd() < 0.6));
  const jobs = years > 6 ? 3 : years > 2.5 ? 2 : 1;
  const companies = [...role.companies].sort(() => rnd() - 0.5);
  const experience: CvData["experience"] = [];
  let end = new Date(NOW - Math.floor(rnd() * 3) * 30 * DAY);
  let left = Math.round(years * 12);
  for (let i = 0; i < jobs; i++) {
    const months = i === jobs - 1 ? left : Math.round(left / (jobs - i));
    left -= months;
    const start = new Date(end.getTime() - months * 30.4 * DAY);
    const mine = skills.filter((_, k) => k % jobs === i).map((s) => s.bullet);
    experience.push({
      company: companies[i],
      role: i === 0 ? title : pick(role.titles),
      period: `${mmYYYY(start)} - ${i === 0 ? "Halen" : mmYYYY(end)}`,
      bullets: mine.length ? mine : ["Ekip içi süreçlerde aktif görev aldım ve günlük operasyonu yürüttüm"],
    });
    end = new Date(start.getTime() - 30 * DAY);
  }
  const gradYear = new Date(end).getFullYear();

  const english = rnd() < 0.3 + quality * 0.6;
  return {
    name,
    title,
    years,
    email: `${ascii(first)}.${ascii(last)}@ornekmail.com`,
    phone: `0 5${30 + Math.floor(rnd() * 20)} ${100 + Math.floor(rnd() * 900)} ${10 + Math.floor(rnd() * 90)} ${10 + Math.floor(rnd() * 90)}`,
    city: pick(CITIES),
    summary:
      `${title} olarak ${years >= 1 ? Math.floor(years) : 1} yılı aşkın süredir çalışıyorum. ` +
      (quality > 0.6
        ? "Ölçeklenebilir, ölçülebilir sonuç üreten işler yapmayı ve ekibimle birlikte öğrenmeyi seviyorum."
        : "Yeni teknolojiler öğrenmeye ve kendimi geliştirmeye açığım."),
    experience,
    education: [`Lisans, ${role.degree}, ${pick(SCHOOLS)} (${gradYear - 4} - ${gradYear})`],
    skills: [...skills.map((s) => s.name), ...role.extras.filter(() => rnd() < 0.6)],
    languages: ["Türkçe (anadil)", ...(english ? [`İngilizce (${quality > 0.7 ? "C1" : "B2"})`] : [])],
    accent: pick(["#6d28d9", "#0f766e", "#1d4ed8", "#be123c", "#b45309", "#334155"]),
  };
}

async function main() {
  console.log("Veritabanı temizleniyor…");
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.scorecard.deleteMany(),
    prisma.interviewPanelist.deleteMany(),
    prisma.interview.deleteMany(),
    prisma.interviewInvite.deleteMany(),
    prisma.emailMessage.deleteMany(),
    prisma.application.deleteMany(),
    prisma.candidate.deleteMany(),
    prisma.requirement.deleteMany(),
    prisma.job.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const company = await prisma.company.create({
    data: {
      name: "Lumen Teknoloji",
      slug: "lumen",
      website: "https://lumen.example.com",
      brandColor: "#6d28d9",
      about:
        "Lumen, 40.000'den fazla işletmenin ödeme ve sipariş süreçlerini yöneten bir finansal teknoloji şirketi. İstanbul, Ankara ve İzmir ofislerimizde 180 kişilik bir ekibiz; uzaktan çalışmaya açığız.",
    },
  });
  const [owner, recruiter, interviewer, cto] = await Promise.all(
    [
      ["Elif Demir", "demo@kadro.dev", "OWNER"],
      ["Burak Aydın", "ik@kadro.dev", "RECRUITER"],
      ["Selin Koç", "mulakat@kadro.dev", "INTERVIEWER"],
      ["Kaan Arslan", "cto@kadro.dev", "INTERVIEWER"],
    ].map(([name, email, role]) =>
      prisma.user.create({
        data: { name, email, passwordHash, memberships: { create: { companyId: company.id, role: role as "OWNER" } } },
      }),
    ),
  );

  let total = 0;
  for (const role of ROLES) {
    const j = role.job;
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: j.title,
        slug: ascii(j.title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        department: j.department,
        location: j.location,
        workType: j.workType,
        description: j.description,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        status: j.status,
        createdAt: ago(35),
        publishedAt: j.status === "OPEN" ? ago(30) : null,
        requirements: {
          create: j.requirements.map((r, position) => ({ ...r, keywords: r.keywords.length ? r.keywords : keywordsFrom(r.text), position })),
        },
      },
      include: { requirements: { orderBy: { position: "asc" } } },
    });

    const scored: { appId: string; score: number; mustMissing: boolean; createdAt: Date }[] = [];
    for (let i = 0; i < role.count; i++) {
      const quality = Math.min(1, Math.max(0, i === 0 ? 0.95 : i === 1 ? 0.85 : rnd() * 1.05));
      const cv = buildCv(role, quality);
      const pdf = await renderCv(cv);
      const key = await storage.save(pdf, "cv.pdf");
      const text = await extractText(pdf, "application/pdf");
      const analysis = await scoring.assess(job, text, cv.name);
      const createdAt = ago(Math.floor(rnd() * 27) + (i < 2 ? 4 : 0));

      const candidate = await prisma.candidate.create({
        data: { companyId: company.id, name: cv.name, email: cv.email, phone: cv.phone, city: cv.city, poolConsent: rnd() < 0.7, createdAt },
      });
      const app = await prisma.application.create({
        data: {
          jobId: job.id,
          candidateId: candidate.id,
          source: pick(SOURCES),
          cvFileKey: key,
          cvFileName: `${ascii(cv.name).replace(/\s+/g, "-")}-cv.pdf`,
          cvMime: "application/pdf",
          cvText: text,
          trackingToken: token(),
          aiStatus: "DONE",
          provider: analysis.provider,
          score: analysis.score,
          analysis: analysis as unknown as Prisma.InputJsonValue,
          createdAt,
          stageChangedAt: createdAt,
          coverLetter:
            quality > 0.7
              ? `Merhaba, ${j.title} ilanınızı büyük bir heyecanla gördüm. Son ${Math.floor(cv.years)} yıldır benzer bir alanda çalışıyorum ve ekibinize katkı sağlayabileceğime inanıyorum.`
              : null,
          activities: {
            create: [
              { type: "applied", data: { source: "Kariyer sayfası" }, createdAt },
              { type: "scored", data: { score: analysis.score, provider: analysis.provider }, createdAt: new Date(createdAt.getTime() + 40_000) },
            ],
          },
        },
      });
      await sendEmail(company.id, app.id, "received", cv.name, j.title, app.trackingToken, createdAt);
      scored.push({ appId: app.id, score: analysis.score, mustMissing: analysis.mustHaveMissing.length > 0, createdAt });
      total++;
      process.stdout.write(`\r${total} aday oluşturuldu`);
    }

    // Puanı yüksek adaylar süreçte ilerlemiş, düşük puanlı ve eski başvurular elenmiş olsun.
    scored.sort((a, b) => b.score - a.score);
    for (const [rank, s] of scored.entries()) {
      const age = (NOW - s.createdAt.getTime()) / DAY;
      let path: Stage[] = [];
      if (age < 3) path = [];
      else if (rank === 0) path = role.key === "frontend" || role.key === "sales" ? ["SCREENING", "INTERVIEW", "OFFER", "HIRED"] : ["SCREENING", "INTERVIEW", "OFFER"];
      else if (rank <= 2) path = ["SCREENING", "INTERVIEW"];
      // Mülakata kadar gelip başka adayla ilerlenen "ikinci tercih": yetenek havuzunda öne çıkar.
      else if (rank === 3 && age > 10 && scored.length >= 8) path = ["SCREENING", "INTERVIEW", "REJECTED"];
      else if (s.mustMissing && age > 6) path = rnd() < 0.5 ? ["REJECTED"] : ["SCREENING", "REJECTED"];
      else if (rank <= 5) path = ["SCREENING"];
      else if (age > 12 && rnd() < 0.4) path = ["SCREENING", "REJECTED"];
      await walk(s.appId, path, s.createdAt, job.title, company.id, [recruiter.id, owner.id], [interviewer.id, cto.id]);
    }
  }

  // Sıralama değerlerini aşama içinde puana göre düzenle (kanban'da en güçlü aday üstte).
  const apps = await prisma.application.findMany({ orderBy: [{ jobId: "asc" }, { stage: "asc" }, { score: "desc" }] });
  const counters = new Map<string, number>();
  for (const a of apps) {
    const k = `${a.jobId}:${a.stage}`;
    const n = (counters.get(k) ?? 0) + 1;
    counters.set(k, n);
    await prisma.application.update({ where: { id: a.id }, data: { rank: n * 1000 } });
  }

  // Ön değerlendirmedeki bir adaya saat seçenekleri gönderilmiş olsun: takip sayfasında seçim ekranı görünür.
  const invitee = await prisma.application.findFirst({
    where: { stage: "SCREENING", job: { companyId: company.id, status: "OPEN" } },
    orderBy: { score: "desc" },
    include: { candidate: true, job: true },
  });
  if (invitee) {
    const panel = [interviewer.id, cto.id];
    const upcoming = await prisma.interview.findMany({ where: { startsAt: { gte: new Date() }, panelists: { some: { userId: { in: panel } } } } });
    const slots = spread(freeSlots(upcoming.map((i) => ({ start: i.startsAt, end: new Date(i.startsAt.getTime() + i.durationMin * 60_000) })), { durationMin: 45, from: new Date(), days: 7 }), 5);
    const sentAt = new Date(NOW - 5 * 3600_000);
    await prisma.interviewInvite.create({
      data: { applicationId: invitee.id, createdById: recruiter.id, title: "Teknik mülakat", durationMin: 45, location: "Google Meet", panelistIds: panel, slots, createdAt: sentAt },
    });
    await prisma.activity.create({ data: { applicationId: invitee.id, actorId: recruiter.id, type: "invite", data: { title: "Teknik mülakat", options: slots.length }, createdAt: sentAt } });
    await sendEmail(company.id, invitee.id, "schedule", invitee.candidate.name, invitee.job.title, invitee.trackingToken, sentAt, { mulakat: "teknik mülakat" });
  }

  console.log(`\nHazır: ${total} başvuru. Giriş: demo@kadro.dev / Demo1234!`);
}

const NOTES = [
  "Telefon görüşmesi yaptım, iletişimi çok iyi. Maaş beklentisi bütçe içinde.",
  "Teknik ödevi zamanında ve temiz teslim etti. Test kapsamı güzel.",
  "Referansları olumlu. Bir önceki yöneticisi ekip içi iletişimini öne çıkardı.",
  "Bir ay ihbar süresi var, başlangıç tarihi için bunu hesaba katalım.",
  "Mülakatta sistem tasarımı sorusunda biraz zorlandı ama düşünce süreci net.",
];

const rejectReason = (path: Stage[]) => (path.includes("INTERVIEW") ? "Başka bir adayla ilerlendi" : "Zorunlu kriterleri karşılamıyor");

async function walk(appId: string, path: Stage[], from: Date, jobTitle: string, companyId: string, recruiters: string[], panel: string[]) {
  let at = from.getTime();
  let stage: Stage = "APPLIED";
  let maxStage: Stage = "APPLIED";
  const app = await prisma.application.findUniqueOrThrow({
    where: { id: appId },
    include: { candidate: true, job: { include: { requirements: { orderBy: { position: "asc" } } } } },
  });

  for (const next of path) {
    at = Math.min(at + (1 + rnd() * 3) * DAY, NOW - 3600_000);
    const actor = pick(recruiters);
    if (next === "INTERVIEW") {
      const startsAt = new Date(at + (2 + rnd() * 4) * DAY);
      startsAt.setHours(10 + Math.floor(rnd() * 6), rnd() < 0.5 ? 0 : 30, 0, 0);
      const done = startsAt.getTime() < NOW;
      const kit = localKit({
        jobTitle,
        interviewTitle: "Teknik mülakat",
        durationMin: 60,
        analysis: app.analysis as unknown as Analysis,
        requirements: app.job.requirements,
        previousNotes: [],
        cvText: app.cvText,
      });
      const answerNotes = ["Somut örnek verdi, ölçerek ilerlemiş.", "Kendi payını net anlattı.", "Genel kaldı, takip sorusunda zorlandı.", "Alternatifleri karşılaştırabildi."];
      await prisma.interview.create({
        data: {
          applicationId: appId,
          title: "Teknik mülakat",
          startsAt,
          durationMin: 60,
          location: rnd() < 0.5 ? "Google Meet: meet.google.com/kdr-demo-abc" : "Maslak ofis, 4. kat toplantı odası",
          createdAt: new Date(at),
          kit: { ...kit, provider: "local", generatedAt: new Date(at).toISOString() } as unknown as Prisma.InputJsonValue,
          panelists: { create: panel.map((userId) => ({ userId })) },
          scorecards: done
            ? {
                create: panel.map((authorId) => {
                  const base = app.score! >= 70 ? 4 : 3;
                  return {
                    authorId,
                    ratings: { "Teknik yetkinlik": base + (rnd() < 0.5 ? 1 : 0), "Problem çözme": base, İletişim: Math.min(5, base + 1), "Takım uyumu": base },
                    recommendation: base >= 4 ? (rnd() < 0.5 ? "STRONG_YES" : "YES") : rnd() < 0.6 ? "YES" : "NO",
                    notes: base >= 4 ? "Güçlü aday, bir sonraki aşamaya geçmeli." : "Temel bilgisi iyi, kıdem beklentimizin biraz altında.",
                    answers: Object.fromEntries(
                      [0, 1, 2].map((i) => {
                        const good = base >= 4 ? rnd() < 0.8 : rnd() < 0.4;
                        return [i, { note: good ? pick([answerNotes[0], answerNotes[1], answerNotes[3]]) : answerNotes[2], signal: good ? "good" : "weak" }];
                      }),
                    ),
                    createdAt: new Date(startsAt.getTime() + 2 * 3600_000),
                  };
                }),
              }
            : undefined,
        },
      });
      await prisma.activity.create({
        data: { applicationId: appId, actorId: actor, type: "interview", data: { title: "Teknik mülakat", startsAt: startsAt.toISOString() }, createdAt: new Date(at) },
      });
      await sendEmail(companyId, appId, "interview", app.candidate.name, jobTitle, app.trackingToken, new Date(at));
    }
    const reason = next === "REJECTED" ? rejectReason(path) : undefined;
    await prisma.activity.create({
      data: { applicationId: appId, actorId: actor, type: "stage", data: { from: stage, to: next, ...(reason ? { reason } : {}) }, createdAt: new Date(at + 60_000) },
    });
    if (next === "REJECTED") await sendEmail(companyId, appId, "rejected", app.candidate.name, jobTitle, app.trackingToken, new Date(at + 120_000));
    if (next === "OFFER") await sendEmail(companyId, appId, "offer", app.candidate.name, jobTitle, app.trackingToken, new Date(at + 120_000));
    if (rnd() < 0.45 && next !== "REJECTED") {
      await prisma.activity.create({
        data: { applicationId: appId, actorId: actor, type: "note", data: { body: pick(NOTES) }, createdAt: new Date(at + 3600_000) },
      });
    }
    stage = next;
    maxStage = furthest(maxStage, next);
    if (next === "INTERVIEW") at = Math.min(at + 5 * DAY, NOW - 3600_000);
  }

  if (path.length) {
    await prisma.application.update({
      where: { id: appId },
      data: {
        stage,
        maxStage,
        stageChangedAt: new Date(at),
        rejectReason: stage === "REJECTED" ? rejectReason(path) : null,
        hiredAt: stage === "HIRED" ? new Date(at) : null,
      },
    });
  }
}

async function sendEmail(companyId: string, applicationId: string, template: keyof typeof TEMPLATES, name: string, job: string, tracking: string, at: Date, extra: Record<string, string> = {}) {
  const vars = { aday: name.split(" ")[0], pozisyon: job, sirket: "Lumen Teknoloji", takip_linki: `http://localhost:3000/basvuru/${tracking}`, ...extra };
  await prisma.emailMessage.create({
    data: {
      companyId,
      applicationId,
      to: `${ascii(name).replace(" ", ".")}@ornekmail.com`,
      template,
      subject: render(TEMPLATES[template].subject, vars),
      body: render(TEMPLATES[template].body, vars),
      status: "SENT",
      createdAt: at,
      sentAt: new Date(at.getTime() + 5000),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
