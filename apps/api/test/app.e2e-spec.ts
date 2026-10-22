import { getQueueToken } from "@nestjs/bullmq";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import request from "supertest";
import { renderCv } from "../prisma/seed/cv-pdf";
import { AppModule } from "../src/app.module";
import { configure } from "../src/main";
import { CV_QUEUE, EMAIL_QUEUE } from "../src/queue/queues";

const prisma = new PrismaClient();
const queued: { name: string; data: unknown }[] = [];
// Kuyruklar sahte: testler Redis'e iş bırakmadan hangi işin kuyruğa girdiğini kontrol eder.
const fakeQueue = { add: async (name: string, data: unknown) => queued.push({ name, data }), addBulk: async (jobs: { name: string; data: unknown }[]) => queued.push(...jobs) };

let app: INestApplication;
let http: ReturnType<typeof request>;
let pdf: Buffer;

async function register(companyName: string, email: string) {
  const res = await http.post("/api/auth/register").send({ companyName, name: "Test Kullanıcı", email, password: "Sifre1234" }).expect(201);
  return { token: res.body.accessToken as string, cookie: res.headers["set-cookie"] as unknown as string[] };
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const jobBody = {
  title: "Backend Geliştirici",
  department: "Mühendislik",
  location: "İstanbul",
  workType: "HYBRID",
  description: "Node.js ve PostgreSQL ile servis geliştirecek ekip arkadaşı arıyoruz. Detaylar mülakatta.",
  status: "OPEN",
  requirements: [
    { text: "Node.js deneyimi", weight: 5, mustHave: true },
    { text: "PostgreSQL", weight: 3, mustHave: false },
  ],
};

beforeAll(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Activity","Scorecard","InterviewPanelist","Interview","EmailMessage","Application","Candidate","Requirement","Job","RefreshToken","Membership","User","Company" CASCADE`,
  );
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getQueueToken(CV_QUEUE)).useValue(fakeQueue)
    .overrideProvider(getQueueToken(EMAIL_QUEUE)).useValue(fakeQueue)
    .compile();
  app = configure(mod.createNestApplication<NestExpressApplication>());
  await app.init();
  http = request(app.getHttpServer());
  pdf = await renderCv({
    name: "Deniz Aday", title: "Backend Geliştirici", email: "deniz@ornek.com", phone: "0 532 000 00 00", city: "İzmir",
    summary: "Node.js ve PostgreSQL ile 6 yıllık deneyim.", accent: "#6d28d9", education: [], skills: ["Node.js", "PostgreSQL"], languages: [],
    experience: [{ company: "Örnek", role: "Backend Geliştirici", period: "01/2020 - Halen", bullets: ["Node.js ile API geliştirdim"] }],
  });
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
  await rm("./storage-test", { recursive: true, force: true });
});

describe("kimlik doğrulama", () => {
  it("kayıt olur, oturumu görür ve yanlış şifreyi reddeder", async () => {
    const { token } = await register("Anadolu Lojistik", "sahip@anadolu.test");
    const me = await http.get("/api/auth/me").set(auth(token)).expect(200);
    expect(me.body.role).toBe("OWNER");
    expect(me.body.company.slug).toBe("anadolu-lojistik");
    await http.post("/api/auth/login").send({ email: "sahip@anadolu.test", password: "yanlis-sifre" }).expect(401);
    await http.get("/api/jobs").expect(401);
  });

  it("aynı e-postayla ikinci kaydı alan hatasıyla reddeder", async () => {
    const res = await http.post("/api/auth/register").send({ companyName: "Başka", name: "X Y", email: "sahip@anadolu.test", password: "Sifre1234" }).expect(409);
    expect(res.body.fields.email).toBeDefined();
  });

  it("yenileme belirtecini döndürür, eski belirteç tekrar kullanılırsa tüm oturumu kapatır", async () => {
    const login = await http.post("/api/auth/login").send({ email: "sahip@anadolu.test", password: "Sifre1234" }).expect(200);
    const first = login.headers["set-cookie"] as unknown as string[];
    const rotated = await http.post("/api/auth/refresh").set("Cookie", first).expect(200);
    const second = rotated.headers["set-cookie"] as unknown as string[];
    // Çalınmış (eski) belirteç kullanılıyor:
    await http.post("/api/auth/refresh").set("Cookie", first).expect(401);
    // Aynı ailedeki yeni belirteç de artık geçersiz:
    await http.post("/api/auth/refresh").set("Cookie", second).expect(401);
  });

  it("form hatalarını alan bazında döner", async () => {
    const res = await http.post("/api/auth/register").send({ companyName: "A", name: "", email: "x", password: "123" }).expect(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(["companyName", "name", "email", "password"]));
  });
});

describe("işe alım akışı", () => {
  let owner: string;
  let jobId: string;
  let appId: string;
  let tracking: string;

  beforeAll(async () => {
    owner = (await register("Kuzey Yazılım", "sahip@kuzey.test")).token;
  });

  it("ilan oluşturur ve kriter anahtar kelimelerini otomatik çıkarır", async () => {
    const res = await http.post("/api/jobs").set(auth(owner)).send(jobBody).expect(201);
    jobId = res.body.id;
    expect(res.body.slug).toBe("backend-gelistirici");
    expect(res.body.requirements[0].keywords).toContain("node.js");
    expect(res.body.publishedAt).not.toBeNull();
  });

  it("kariyer sayfasında yayındaki ilanı gösterir", async () => {
    const res = await http.get("/api/careers/kuzey-yazilim").expect(200);
    expect(res.body.jobs).toHaveLength(1);
    await http.get("/api/careers/kuzey-yazilim/jobs/backend-gelistirici").expect(200);
  });

  it("dosya türünü uzantıya değil içeriğe göre doğrular", async () => {
    const res = await http
      .post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
      .field("name", "Sahte Dosya").field("email", "sahte@ornek.com").field("kvkk", "true")
      .attach("cv", Buffer.from("bu bir pdf değil"), { filename: "cv.pdf", contentType: "application/pdf" })
      .expect(400);
    expect(res.body.fields.cv).toBeDefined();
  });

  it("başvuruyu alır, CV puanlamasını ve onay e-postasını kuyruğa koyar", async () => {
    queued.length = 0;
    const res = await http
      .post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
      .field("name", "Deniz Aday").field("email", "Deniz@Ornek.com").field("kvkk", "true").field("source", "LinkedIn")
      .attach("cv", pdf, { filename: "deniz-cv.pdf", contentType: "application/pdf" })
      .expect(201);
    tracking = res.body.trackingToken;
    expect(queued.map((q) => q.name)).toEqual(["analyze", "send"]);
    const app = await prisma.application.findUniqueOrThrow({ where: { trackingToken: tracking }, include: { candidate: true } });
    appId = app.id;
    expect(app.candidate.email).toBe("deniz@ornek.com");
    expect(app.source).toBe("LinkedIn");
  });

  it("aynı ilana ikinci başvuruyu reddeder", async () => {
    await http
      .post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
      .field("name", "Deniz Aday").field("email", "deniz@ornek.com").field("kvkk", "true")
      .attach("cv", pdf, { filename: "cv.pdf", contentType: "application/pdf" })
      .expect(409);
  });

  it("KVKK onayı olmadan başvuru almaz", async () => {
    const res = await http
      .post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
      .field("name", "Onaysız Aday").field("email", "onaysiz@ornek.com")
      .attach("cv", pdf, { filename: "cv.pdf", contentType: "application/pdf" })
      .expect(400);
    expect(res.body.fields.kvkk).toBeDefined();
  });

  it("kanban'da adayı taşır, geçmişe yazar ve hunideki en ileri aşamayı korur", async () => {
    await http.patch(`/api/applications/${appId}/move`).set(auth(owner)).send({ stage: "INTERVIEW" }).expect(200);
    await http.patch(`/api/applications/${appId}/move`).set(auth(owner)).send({ stage: "REJECTED", reason: "Test" }).expect(200);
    const a = await prisma.application.findUniqueOrThrow({ where: { id: appId }, include: { activities: true } });
    expect(a.stage).toBe("REJECTED");
    expect(a.maxStage).toBe("INTERVIEW");
    expect(a.activities.filter((x) => x.type === "stage")).toHaveLength(2);
    await http.patch(`/api/applications/${appId}/move`).set(auth(owner)).send({ stage: "SCREENING" }).expect(200);
  });

  it("CV metninde Türkçe kök eşleştirmesiyle arar", async () => {
    await prisma.application.update({ where: { id: appId }, data: { cvText: "Mikroservis mimarisinde ödeme sistemleri geliştirdim." } });
    const res = await http.get("/api/applications?q=sistemler").set(auth(owner)).expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].headline).toContain("⟦");
    const none = await http.get("/api/applications?q=kubernetes").set(auth(owner)).expect(200);
    expect(none.body.total).toBe(0);
  });

  it("aday takip sayfası iç notları göstermez, geri çekmeye izin verir", async () => {
    await http.post(`/api/applications/${appId}/notes`).set(auth(owner)).send({ body: "Gizli iç not" }).expect(201);
    const res = await http.get(`/api/track/${tracking}`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain("Gizli iç not");
    expect(res.body.steps[1].current).toBe(true);
    await http.post(`/api/track/${tracking}/withdraw`).expect(200);
    const after = await http.get(`/api/track/${tracking}`).expect(200);
    expect(after.body.status).toBe("closed");
    expect(after.body.withdrawn).toBe(true);
  });

  it("kriter değişince yeniden puanlamayı önerir", async () => {
    const job = (await http.get(`/api/jobs/${jobId}`).set(auth(owner))).body;
    const res = await http.put(`/api/jobs/${jobId}`).set(auth(owner)).send({ ...jobBody, requirements: [...job.requirements, { text: "Docker", weight: 2, mustHave: false }] }).expect(200);
    expect(res.body.requirementsChanged).toBe(true);
    queued.length = 0;
    const r = await http.post(`/api/jobs/${jobId}/rescore`).set(auth(owner)).expect(202);
    expect(r.body.queued).toBe(1);
    expect(queued).toHaveLength(1);
  });

  describe("yetki ve şirket izolasyonu", () => {
    let interviewer: string;
    let stranger: string;

    beforeAll(async () => {
      await http.post("/api/company/members").set(auth(owner)).send({ name: "Mülakatçı Kişi", email: "mulakat@kuzey.test", role: "INTERVIEWER", password: "Sifre1234" }).expect(201);
      interviewer = (await http.post("/api/auth/login").send({ email: "mulakat@kuzey.test", password: "Sifre1234" })).body.accessToken;
      stranger = (await register("Rakip A.Ş.", "sahip@rakip.test")).token;
    });

    it("mülakatçı adayı görür ve not ekler ama aşama değiştiremez", async () => {
      await http.get(`/api/applications/${appId}`).set(auth(interviewer)).expect(200);
      await http.post(`/api/applications/${appId}/notes`).set(auth(interviewer)).send({ body: "İyi aday" }).expect(201);
      await http.patch(`/api/applications/${appId}/move`).set(auth(interviewer)).send({ stage: "OFFER" }).expect(403);
      await http.post("/api/jobs").set(auth(interviewer)).send(jobBody).expect(403);
    });

    it("başka şirket bu şirketin ilanına, adayına ve CV'sine erişemez", async () => {
      await http.get(`/api/jobs/${jobId}`).set(auth(stranger)).expect(404);
      await http.get(`/api/applications/${appId}`).set(auth(stranger)).expect(404);
      await http.get(`/api/applications/${appId}/cv`).set(auth(stranger)).expect(404);
      await http.patch(`/api/applications/${appId}/move`).set(auth(stranger)).send({ stage: "HIRED" }).expect(404);
      const list = await http.get("/api/applications").set(auth(stranger)).expect(200);
      expect(list.body.total).toBe(0);
    });

    it("son yöneticinin rolü düşürülemez", async () => {
      const members = (await http.get("/api/company/members").set(auth(owner))).body as { id: string; role: string }[];
      const me = members.find((m) => m.role === "OWNER")!;
      await http.patch(`/api/company/members/${me.id}`).set(auth(owner)).send({ role: "RECRUITER" }).expect(400);
    });
  });

  it("mülakat planlar, .ics üretir ve değerlendirme formunu yalnızca mülakatçıya açar", async () => {
    const members = (await http.get("/api/company/members").set(auth(owner))).body as { userId: string; role: string }[];
    const panelist = members.find((m) => m.role === "INTERVIEWER")!;
    const iv = await http.post(`/api/applications/${appId}/interviews`).set(auth(owner))
      .send({ title: "Teknik mülakat", startsAt: new Date(Date.now() + 86400_000).toISOString(), durationMin: 60, location: "Google Meet", panelistIds: [panelist.userId] })
      .expect(201);
    // Mülakat kiti kayıtla birlikte hazırlanır (anahtar yokken yerel şablonla), süreye göre soru sayısı belirlenir.
    expect(iv.body.kit.provider).toBe("local");
    expect(iv.body.kit.questions).toHaveLength(6);
    expect(iv.body.kit.questions[0].requirementId).toBeTruthy();
    const kit = await http.post(`/api/interviews/${iv.body.id}/kit`).set(auth(owner)).expect(201);
    expect(kit.body.focus).toBeTruthy();
    const ics = await http.get(`/api/interviews/${iv.body.id}/ics`).set(auth(owner)).expect(200);
    expect(ics.text).toContain("BEGIN:VEVENT");
    expect(ics.text).toContain("Deniz Aday");

    const interviewer = (await http.post("/api/auth/login").send({ email: "mulakat@kuzey.test", password: "Sifre1234" })).body.accessToken;
    const card = { ratings: { "Teknik yetkinlik": 4 }, recommendation: "YES", notes: "", answers: { 0: { note: "Somut örnek verdi", signal: "good" } } };
    const saved = await http.put(`/api/interviews/${iv.body.id}/scorecard`).set(auth(interviewer)).send(card).expect(200);
    expect(saved.body.answers["0"]).toEqual({ note: "Somut örnek verdi", signal: "good" });

    // Yöneticinin formu yokken mülakatçı yöneticinin formunu göremez; yönetici kendi formunu doldurmadan da görebilir.
    const asOwner = await http.get(`/api/applications/${appId}`).set(auth(owner)).expect(200);
    expect(asOwner.body.interviews[0].scorecards).toHaveLength(1);
  });

  it("analitik huniyi en ileri aşamaya göre hesaplar", async () => {
    const res = await http.get("/api/analytics").set(auth(owner)).expect(200);
    const funnel = Object.fromEntries(res.body.funnel.map((f: { stage: string; count: number }) => [f.stage, f.count]));
    expect(funnel.APPLIED).toBe(1);
    expect(funnel.INTERVIEW).toBe(1);
    expect(funnel.OFFER).toBe(0);
  });

  it("adaya saat seçtirir: seçilen saat mülakata dönüşür, aynı saat ikinci kez alınamaz", async () => {
    const members = (await http.get("/api/company/members").set(auth(owner))).body as { userId: string; role: string }[];
    const panelistIds = [members.find((m) => m.role === "INTERVIEWER")!.userId];
    const apply = async (name: string, email: string) => {
      const res = await http.post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
        .field("name", name).field("email", email).field("kvkk", "true")
        .attach("cv", pdf, { filename: "cv.pdf", contentType: "application/pdf" }).expect(201);
      const a = await prisma.application.findUniqueOrThrow({ where: { trackingToken: res.body.trackingToken } });
      return { id: a.id, token: res.body.trackingToken as string };
    };
    const ece = await apply("Ece Saat", "ece@ornek.com");
    const can = await apply("Can Saat", "can@ornek.com");

    // Önceki testte bu mülakatçıya planlanan mülakat (yarın) önerilerde çakışmaz.
    const sug = await http.get(`/api/applications/${ece.id}/invite-slots?panelistIds=${panelistIds.join(",")}&durationMin=45`).set(auth(owner)).expect(200);
    expect(sug.body.suggested.length).toBeGreaterThan(0);
    const existing = await prisma.interview.findFirstOrThrow({ where: { panelists: { some: { userId: panelistIds[0] } } } });
    const all = sug.body.days.flatMap((d: { slots: string[] }) => d.slots).map((s: string) => new Date(s).getTime());
    expect(all.some((t: number) => Math.abs(t - existing.startsAt.getTime()) < 60 * 60_000)).toBe(false);

    const slots = sug.body.suggested.slice(0, 3);
    queued.length = 0;
    const body = { title: "Teknik mülakat", durationMin: 45, location: "Google Meet", panelistIds, slots };
    await http.post(`/api/applications/${ece.id}/invites`).set(auth(owner)).send(body).expect(201);
    await http.post(`/api/applications/${can.id}/invites`).set(auth(owner)).send(body).expect(201);
    expect(queued.filter((q) => q.name === "send")).toHaveLength(2);

    const track = await http.get(`/api/track/${ece.token}`).expect(200);
    expect(track.body.invite.slots).toHaveLength(3);
    expect(track.body.invite.slots.every((s: { available: boolean }) => s.available)).toBe(true);

    await http.post(`/api/track/${ece.token}/book`).send({ startsAt: new Date(Date.now() + 86400_000 * 30).toISOString() }).expect(400);
    const booked = await http.post(`/api/track/${ece.token}/book`).send({ startsAt: slots[0] }).expect(200);
    expect(new Date(booked.body.startsAt).toISOString()).toBe(new Date(slots[0]).toISOString());

    const detail = await http.get(`/api/applications/${ece.id}`).set(auth(owner)).expect(200);
    expect(detail.body.stage).toBe("INTERVIEW");
    expect(detail.body.interviews).toHaveLength(1);
    expect(detail.body.interviews[0].kit.questions.length).toBeGreaterThan(0);
    expect(detail.body.invites).toHaveLength(0);
    const ics = await http.get(`/api/track/${ece.token}/interviews/${booked.body.id}/ics`).expect(200);
    expect(ics.text).toContain("BEGIN:VEVENT");

    // Diğer aday aynı mülakatçının aynı saatini artık alamaz, ama kalan seçenekler açık.
    const other = await http.get(`/api/track/${can.token}`).expect(200);
    expect(other.body.invite.slots.map((s: { available: boolean }) => s.available)).toEqual([false, true, true]);
    await http.post(`/api/track/${can.token}/book`).send({ startsAt: slots[0] }).expect(409);
    await http.post(`/api/track/${can.token}/book`).send({ startsAt: slots[1] }).expect(200);
    // Aynı davetle ikinci kez saat seçilemez.
    await http.post(`/api/track/${can.token}/book`).send({ startsAt: slots[2] }).expect(400);
  });

  it("yetenek havuzu yalnızca onay veren adayları yeni ilana önerir ve hatta ekler", async () => {
    const res = await http.post("/api/careers/kuzey-yazilim/jobs/backend-gelistirici/apply")
      .field("name", "Pelin Havuz").field("email", "pelin@ornek.com").field("kvkk", "true").field("pool", "true")
      .attach("cv", pdf, { filename: "cv.pdf", contentType: "application/pdf" }).expect(201);
    const pelinApp = await prisma.application.findUniqueOrThrow({ where: { trackingToken: res.body.trackingToken } });
    // Kuyruk sahte olduğu için worker'ın çıkaracağı CV metni elle yazılır; tüm adaylar aynı CV'ye sahip.
    await prisma.application.updateMany({ where: { jobId }, data: { cvText: "Backend Geliştirici 01/2020 - Halen. Node.js ile API geliştirdim, PostgreSQL ile çalıştım." } });

    const platform = await http.post("/api/jobs").set(auth(owner))
      .send({ ...jobBody, title: "Platform Mühendisi", requirements: [{ text: "Node.js deneyimi", weight: 5, mustHave: true }, { text: "PostgreSQL", weight: 3, mustHave: false }] })
      .expect(201);

    const pool = await http.get(`/api/jobs/${platform.body.id}/talent-pool`).set(auth(owner)).expect(200);
    // Aynı CV'ye sahip diğer adaylar onay vermediği için listede yok.
    expect(pool.body.map((m: { candidate: { name: string } }) => m.candidate.name)).toEqual(["Pelin Havuz"]);
    expect(pool.body[0].score).toBeGreaterThanOrEqual(50);
    expect(pool.body[0].previous[0].job.title).toBe("Backend Geliştirici");

    const matches = await http.get(`/api/applications/${pelinApp.id}/matches`).set(auth(owner)).expect(200);
    expect(matches.body.consent).toBe(true);
    expect(matches.body.matches[0].job.title).toBe("Platform Mühendisi");

    queued.length = 0;
    await http.post(`/api/jobs/${platform.body.id}/talent-pool/${pool.body[0].candidate.id}`).set(auth(owner)).expect(201);
    expect(queued.map((q) => q.name)).toEqual(["analyze", "send"]);
    await http.post(`/api/jobs/${platform.body.id}/talent-pool/${pool.body[0].candidate.id}`).set(auth(owner)).expect(409);
    const board = await http.get(`/api/jobs/${platform.body.id}/applications`).set(auth(owner)).expect(200);
    expect(board.body[0].source).toBe("Yetenek havuzu");

    const ece = await prisma.candidate.findFirstOrThrow({ where: { email: "ece@ornek.com" } });
    await http.post(`/api/jobs/${platform.body.id}/talent-pool/${ece.id}`).set(auth(owner)).expect(400);

    // Aday onayını geri çekince başka ilanlara önerilmez.
    const track = await http.get(`/api/track/${res.body.trackingToken}`).expect(200);
    expect(track.body.poolConsent).toBe(true);
    await http.post(`/api/track/${res.body.trackingToken}/leave-pool`).expect(200);
    const third = await http.post("/api/jobs").set(auth(owner)).send({ ...jobBody, title: "Kıdemli Backend" }).expect(201);
    const empty = await http.get(`/api/jobs/${third.body.id}/talent-pool`).set(auth(owner)).expect(200);
    expect(empty.body).toHaveLength(0);
  });
});
