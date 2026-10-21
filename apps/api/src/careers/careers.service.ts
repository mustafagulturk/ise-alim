import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";
import { CV_MIME, sniffMime } from "../ai/cv-text";
import { STAGE_LABEL } from "../applications/stages";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../common/storage.service";
import { rankBetween, token } from "../common/util";
import { EmailsService } from "../emails/emails.service";
import { CV_QUEUE, type CvJob } from "../queue/queues";
import type { ApplyBody } from "./careers.schema";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

/** Adaya gösterilen sade aşamalar: iç süreç (ön değerlendirme, teklif görüşmesi) dışarı yansımaz. */
const CANDIDATE_STEPS = [
  { key: "received", label: "Başvuru alındı", stages: ["APPLIED"] },
  { key: "review", label: "İnceleniyor", stages: ["SCREENING"] },
  { key: "interview", label: "Mülakat", stages: ["INTERVIEW"] },
  { key: "result", label: "Sonuç", stages: ["OFFER", "HIRED"] },
];

@Injectable()
export class CareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    private readonly emails: EmailsService,
    @InjectQueue(CV_QUEUE) private readonly cvQueue: Queue<CvJob>,
  ) {}

  async company(slug: string) {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        about: true,
        website: true,
        brandColor: true,
        jobs: {
          where: { status: "OPEN" },
          orderBy: { publishedAt: "desc" },
          select: { slug: true, title: true, department: true, location: true, workType: true, employmentType: true, publishedAt: true },
        },
      },
    });
    if (!company) throw new NotFoundException("Şirket bulunamadı.");
    return company;
  }

  async job(slug: string, jobSlug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug: jobSlug, status: "OPEN", company: { slug } },
      select: {
        id: true,
        slug: true,
        title: true,
        department: true,
        location: true,
        workType: true,
        employmentType: true,
        description: true,
        salaryMin: true,
        salaryMax: true,
        publishedAt: true,
        requirements: { orderBy: { position: "asc" }, select: { text: true, mustHave: true } },
        company: { select: { name: true, slug: true, about: true, website: true, brandColor: true } },
      },
    });
    if (!job) throw new NotFoundException("İlan bulunamadı ya da yayından kaldırıldı.");
    return job;
  }

  async apply(slug: string, jobSlug: string, body: ApplyBody, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException({ message: "CV dosyası gerekli.", fields: { cv: "CV dosyanızı ekleyin." } });
    if (file.size > MAX_CV_BYTES) throw new BadRequestException({ message: "Dosya 5 MB'tan büyük.", fields: { cv: "En fazla 5 MB." } });
    const mime = sniffMime(file.buffer);
    if (!mime) throw new BadRequestException({ message: "Yalnızca PDF ya da Word (.docx) yükleyebilirsiniz.", fields: { cv: "PDF ya da DOCX olmalı." } });

    const job = await this.prisma.job.findFirst({ where: { slug: jobSlug, status: "OPEN", company: { slug } } });
    if (!job) throw new NotFoundException("İlan bulunamadı ya da başvuruya kapandı.");

    const email = body.email.toLowerCase();
    const candidate = await this.prisma.candidate.upsert({
      where: { companyId_email: { companyId: job.companyId, email } },
      create: { companyId: job.companyId, email, name: body.name, phone: body.phone, city: body.city, linkedin: body.linkedin },
      update: { name: body.name, phone: body.phone ?? undefined, city: body.city ?? undefined, linkedin: body.linkedin ?? undefined },
    });
    if (await this.prisma.application.findUnique({ where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } } })) {
      throw new ConflictException("Bu ilana daha önce başvurdunuz. Durumunu e-postanızdaki bağlantıdan takip edebilirsiniz.");
    }

    const key = await this.storage.save(file.buffer, `cv${CV_MIME[mime]}`);
    const last = await this.prisma.application.findFirst({ where: { jobId: job.id, stage: "APPLIED" }, orderBy: { rank: "desc" } });
    const app = await this.prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        coverLetter: body.coverLetter || null,
        source: body.source || "Kariyer sayfası",
        cvFileKey: key,
        cvFileName: file.originalname.slice(0, 120),
        cvMime: mime,
        trackingToken: token(),
        rank: rankBetween(last?.rank ?? null, null),
        activities: { create: { type: "applied", data: { source: body.source || "Kariyer sayfası" } } },
      },
    });

    await this.cvQueue.add("analyze", { applicationId: app.id });
    await this.emails.send(app.id, "received");
    await this.events.publish({ companyId: job.companyId, type: "application.created", jobId: job.id, applicationId: app.id });
    return { trackingToken: app.trackingToken };
  }

  async track(trackingToken: string) {
    const app = await this.prisma.application.findUnique({
      where: { trackingToken },
      include: {
        candidate: { select: { name: true } },
        job: { select: { title: true, slug: true, location: true, company: { select: { name: true, slug: true, brandColor: true } } } },
        interviews: { where: { cancelledAt: null, startsAt: { gte: new Date(Date.now() - 86400_000) } }, orderBy: { startsAt: "asc" } },
        activities: { where: { type: { in: ["applied", "stage"] } }, orderBy: { createdAt: "asc" } },
        emails: { orderBy: { createdAt: "desc" }, select: { id: true, subject: true, body: true, createdAt: true } },
      },
    });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");

    const closed = app.stage === "REJECTED";
    const current = closed ? -1 : CANDIDATE_STEPS.findIndex((s) => s.stages.includes(app.stage));
    return {
      name: app.candidate.name.split(" ")[0],
      job: app.job,
      appliedAt: app.createdAt,
      status: closed ? "closed" : app.stage === "HIRED" || app.stage === "OFFER" ? "offer" : "active",
      withdrawn: app.rejectReason === WITHDRAWN,
      steps: CANDIDATE_STEPS.map((s, i) => ({ label: s.label, done: !closed && i < current, current: i === current })),
      stageLabel: closed ? "Süreç tamamlandı" : STAGE_LABEL[app.stage],
      interviews: app.interviews.map((i) => ({ id: i.id, title: i.title, startsAt: i.startsAt, durationMin: i.durationMin, location: i.location })),
      emails: app.emails,
    };
  }

  async withdraw(trackingToken: string) {
    const app = await this.prisma.application.findUnique({ where: { trackingToken }, include: { job: true } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    if (app.stage === "REJECTED" || app.stage === "HIRED") throw new BadRequestException("Bu başvuru zaten sonuçlanmış.");
    await this.prisma.application.update({
      where: { id: app.id },
      data: { stage: "REJECTED", rejectReason: WITHDRAWN, stageChangedAt: new Date() },
    });
    await this.prisma.activity.create({ data: { applicationId: app.id, type: "stage", data: { from: app.stage, to: "REJECTED", reason: WITHDRAWN } } });
    await this.events.publish({ companyId: app.job.companyId, type: "application.moved", jobId: app.jobId, applicationId: app.id, data: { stage: "REJECTED" } });
    return { ok: true };
  }
}

export const WITHDRAWN = "Aday başvurusunu geri çekti";
