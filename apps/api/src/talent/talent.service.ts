import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Stage } from "@prisma/client";
import type { Queue } from "bullmq";
import { type JobInput, computeScore } from "../ai/analysis";
import { localAssess } from "../ai/local-scorer";
import { stageIndex } from "../applications/stages";
import type { AuthUser } from "../common/auth";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { rankBetween, token } from "../common/util";
import { EmailsService } from "../emails/emails.service";
import { CV_QUEUE, type CvJob } from "../queue/queues";

/** Havuz önerisi için alt sınır: bunun altındaki eşleşmeler İK'nın vaktini almasın. */
export const POOL_MIN_SCORE = 50;
/** Aday profilinde gösterilecek en düşük uygunluk; alakasız ilanlar kartı kalabalıklaştırmasın. */
const MATCH_MIN_SCORE = 30;
const MAX_CANDIDATES = 500;

interface PastApplication {
  id: string;
  stage: Stage;
  maxStage: Stage;
  score: number | null;
  createdAt: Date;
  job: { id: string; title: string };
}

/** Daha önce mülakata kadar gelip başka bir aday tercih edildiği için elenen ("ikinci tercih") aday mı? */
export function silverMedalist(apps: Pick<PastApplication, "stage" | "maxStage">[]) {
  return apps.some((a) => a.stage === "REJECTED" && stageIndex(a.maxStage) >= stageIndex("INTERVIEW"));
}

/**
 * Yetenek havuzu: başka ilanlara başvurmuş ve onay vermiş adayları yeni bir ilana göre puanlar.
 * Yüzlerce adayı tek tek modele göndermek pahalı olduğu için öneri hızlı yerel puanlayıcıyla yapılır;
 * aday hatta eklenince asıl değerlendirme (Claude varsa onunla) kuyrukta yapılır.
 */
@Injectable()
export class TalentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly emails: EmailsService,
    @InjectQueue(CV_QUEUE) private readonly cvQueue: Queue<CvJob>,
  ) {}

  async forJob(companyId: string, jobId: string) {
    const job = await this.job(companyId, jobId);
    const candidates = await this.prisma.candidate.findMany({
      where: { companyId, poolConsent: true, applications: { none: { jobId } } },
      take: MAX_CANDIDATES,
      select: {
        id: true,
        name: true,
        city: true,
        applications: {
          orderBy: { createdAt: "desc" },
          select: { id: true, stage: true, maxStage: true, score: true, createdAt: true, job: { select: { id: true, title: true } } },
        },
      },
    });
    const texts = await this.latestTexts(candidates.map((c) => c.applications[0]?.id).filter(Boolean));

    return candidates
      .map((c) => {
        const latest = c.applications[0];
        const text = latest && texts.get(latest.id);
        if (!text) return null;
        return { candidate: { id: c.id, name: c.name, city: c.city }, ...this.match(job, text), previous: c.applications, silverMedalist: silverMedalist(c.applications) };
      })
      .filter((m): m is NonNullable<typeof m> => !!m && m.score >= POOL_MIN_SCORE)
      .sort((a, b) => Number(b.silverMedalist) - Number(a.silverMedalist) || b.score - a.score)
      .slice(0, 20);
  }

  /** Aday profilinden: başvurmadığı diğer açık ilanlara ne kadar uygun? */
  async forApplication(companyId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, job: { companyId } },
      select: { cvText: true, candidate: { select: { id: true, poolConsent: true, applications: { select: { jobId: true } } } } },
    });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    const applied = app.candidate.applications.map((a) => a.jobId);
    const jobs = await this.prisma.job.findMany({
      where: { companyId, status: "OPEN", id: { notIn: applied } },
      include: { requirements: { orderBy: { position: "asc" } } },
    });
    return {
      consent: app.candidate.poolConsent,
      candidateId: app.candidate.id,
      matches: jobs
        .map((j) => ({ job: { id: j.id, title: j.title, department: j.department }, ...this.match(j, app.cvText) }))
        .filter((m) => m.score >= MATCH_MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4),
    };
  }

  async add(user: AuthUser, jobId: string, candidateId: string) {
    const job = await this.job(user.companyId, jobId);
    if (job.status !== "OPEN") throw new BadRequestException("Yalnızca yayındaki ilanlara aday eklenebilir.");
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, companyId: user.companyId },
      include: { applications: { orderBy: { createdAt: "desc" }, include: { job: { select: { title: true } } } } },
    });
    if (!candidate) throw new NotFoundException("Aday bulunamadı.");
    if (!candidate.poolConsent) throw new BadRequestException("Aday, başka pozisyonlar için değerlendirilmeye onay vermemiş.");
    if (candidate.applications.some((a) => a.jobId === jobId)) throw new ConflictException("Aday bu ilanın aday hattında zaten var.");
    const source = candidate.applications[0];
    if (!source) throw new BadRequestException("Adayın CV'si bulunamadı.");

    const last = await this.prisma.application.findFirst({ where: { jobId, stage: "APPLIED" }, orderBy: { rank: "desc" } });
    const app = await this.prisma.application.create({
      data: {
        jobId,
        candidateId,
        source: "Yetenek havuzu",
        cvFileKey: source.cvFileKey,
        cvFileName: source.cvFileName,
        cvMime: source.cvMime,
        cvText: source.cvText,
        trackingToken: token(),
        rank: rankBetween(last?.rank ?? null, null),
        activities: { create: { type: "sourced", actorId: user.userId, data: { fromJob: source.job.title } } },
      },
    });
    await this.cvQueue.add("analyze", { applicationId: app.id });
    await this.emails.send(app.id, "sourced");
    await this.events.publish({ companyId: user.companyId, type: "application.created", jobId, applicationId: app.id, actorId: user.userId });
    return { id: app.id };
  }

  private match(job: JobInput, cvText: string) {
    const assessment = localAssess(job, cvText);
    const { score, scored, mustHaveMissing } = computeScore(job.requirements, assessment);
    return {
      score,
      met: scored.filter((r) => r.verdict === "met").length,
      total: scored.length,
      highlights: scored.filter((r) => r.verdict === "met").sort((a, b) => b.weight - a.weight).slice(0, 3).map((r) => r.text),
      mustHaveMissing,
      skills: assessment.skills.slice(0, 5),
      experienceYears: assessment.experienceYears,
    };
  }

  private async job(companyId: string, id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, companyId }, include: { requirements: { orderBy: { position: "asc" } } } });
    if (!job) throw new NotFoundException("İlan bulunamadı.");
    return job;
  }

  private async latestTexts(ids: string[]) {
    const rows = await this.prisma.application.findMany({ where: { id: { in: ids } }, select: { id: true, cvText: true } });
    return new Map(rows.map((r) => [r.id, r.cvText]));
  }
}
