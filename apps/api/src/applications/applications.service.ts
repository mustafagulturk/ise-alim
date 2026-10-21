import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Stage } from "@prisma/client";
import type { Queue } from "bullmq";
import type { AuthUser } from "../common/auth";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../common/storage.service";
import { rankBetween } from "../common/util";
import { EmailsService } from "../emails/emails.service";
import type { TemplateKey } from "../emails/templates";
import { CV_QUEUE, type CvJob } from "../queue/queues";
import type { BulkBody, ListQuery, MoveBody } from "./applications.schema";
import { furthest } from "./stages";

const PAGE = 25;

const cardSelect = {
  id: true,
  jobId: true,
  stage: true,
  rank: true,
  score: true,
  aiStatus: true,
  provider: true,
  source: true,
  createdAt: true,
  stageChangedAt: true,
  analysis: true,
  candidate: { select: { id: true, name: true, email: true, city: true } },
  _count: { select: { interviews: true, activities: { where: { type: "note" } } } },
} satisfies Prisma.ApplicationSelect;

type CardRow = Prisma.ApplicationGetPayload<{ select: typeof cardSelect }>;

/** Kart için analizden yalnızca özet alanları gönderilir; tam analiz detay sayfasında. */
function toCard({ analysis, _count, ...a }: CardRow) {
  const an = analysis as { skills?: string[]; mustHaveMissing?: string[]; experienceYears?: number | null } | null;
  return {
    ...a,
    skills: an?.skills?.slice(0, 3) ?? [],
    mustHaveMissing: (an?.mustHaveMissing?.length ?? 0) > 0,
    experienceYears: an?.experienceYears ?? null,
    interviewCount: _count.interviews,
    noteCount: _count.activities,
  };
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    private readonly emails: EmailsService,
    @InjectQueue(CV_QUEUE) private readonly cvQueue: Queue<CvJob>,
  ) {}

  async board(companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } });
    if (!job) throw new NotFoundException("İlan bulunamadı.");
    const rows = await this.prisma.application.findMany({
      where: { jobId },
      orderBy: [{ stage: "asc" }, { rank: "asc" }],
      select: cardSelect,
    });
    return rows.map(toCard);
  }

  /**
   * Tüm adaylar listesi. Arama CV metninde Türkçe kök bulma ile yapılır (ör. "geliştirdim" -> "geliştir").
   * Vurgular HTML yerine ⟦ ⟧ işaretleriyle döner; CV adaydan geldiği için istemci HTML olarak basmaz.
   */
  async list(companyId: string, q: ListQuery) {
    const where: Prisma.ApplicationWhereInput = {
      job: { companyId },
      ...(q.jobId ? { jobId: q.jobId } : {}),
      ...(q.stage ? { stage: q.stage } : {}),
      ...(q.minScore != null ? { score: { gte: q.minScore } } : {}),
    };
    let headlines = new Map<string, string>();

    if (q.q) {
      const hits = await this.prisma.$queryRaw<{ id: string; headline: string | null }[]>`
        SELECT a.id,
               ts_headline('turkish', a."cvText", websearch_to_tsquery('turkish', ${q.q}),
                           'MaxWords=18, MinWords=8, StartSel=⟦, StopSel=⟧') AS headline
        FROM "Application" a
        JOIN "Job" j ON j.id = a."jobId"
        JOIN "Candidate" c ON c.id = a."candidateId"
        WHERE j."companyId" = ${companyId}
          AND (a."searchVector" @@ websearch_to_tsquery('turkish', ${q.q})
               OR c.name ILIKE ${`%${q.q}%`} OR c.email ILIKE ${`%${q.q}%`})
        LIMIT 500`;
      headlines = new Map(hits.map((h) => [h.id, h.headline ?? ""]));
      where.id = { in: hits.map((h) => h.id) };
    }

    const [total, rows] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: q.sort === "score" ? [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] : { createdAt: "desc" },
        skip: (q.page - 1) * PAGE,
        take: PAGE,
        select: { ...cardSelect, job: { select: { id: true, title: true } } },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: PAGE,
      items: rows.map(({ job, ...r }) => ({ ...toCard(r), job, headline: headlines.get(r.id) || null })),
    };
  }

  async detail(user: AuthUser, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, job: { companyId: user.companyId } },
      include: {
        candidate: true,
        job: { include: { requirements: { orderBy: { position: "asc" } } } },
        activities: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } },
        interviews: {
          orderBy: { startsAt: "asc" },
          include: {
            panelists: { include: { user: { select: { id: true, name: true } } } },
            scorecards: { include: { author: { select: { id: true, name: true } } } },
          },
        },
        emails: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    const others = await this.prisma.application.findMany({
      where: { candidateId: app.candidateId, id: { not: id } },
      select: { id: true, stage: true, score: true, createdAt: true, job: { select: { id: true, title: true } } },
    });
    const { trackingToken: _t, cvFileKey: _k, ...rest } = app;
    // Önyargıyı önlemek için mülakatçı, kendi formunu doldurmadan diğerlerinin değerlendirmesini göremez.
    const interviews = rest.interviews.map((iv) => {
      if (user.role !== "INTERVIEWER" || iv.scorecards.some((s) => s.authorId === user.userId)) return { ...iv, hiddenScorecards: 0 };
      return { ...iv, scorecards: [], hiddenScorecards: iv.scorecards.length };
    });
    return { ...rest, interviews, otherApplications: others };
  }

  async cv(companyId: string, id: string) {
    const app = await this.prisma.application.findFirst({ where: { id, job: { companyId } } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    return { buffer: await this.storage.read(app.cvFileKey), mime: app.cvMime, name: app.cvFileName };
  }

  async move(user: AuthUser, id: string, body: MoveBody) {
    const app = await this.find(user.companyId, id);
    const [before, after] = await Promise.all([
      body.beforeId ? this.prisma.application.findFirst({ where: { id: body.beforeId, jobId: app.jobId }, select: { rank: true } }) : null,
      body.afterId ? this.prisma.application.findFirst({ where: { id: body.afterId, jobId: app.jobId }, select: { rank: true } }) : null,
    ]);
    let rank: number;
    if (before || after) rank = rankBetween(before?.rank ?? null, after?.rank ?? null);
    else {
      const last = await this.prisma.application.findFirst({ where: { jobId: app.jobId, stage: body.stage }, orderBy: { rank: "desc" } });
      rank = rankBetween(last?.rank ?? null, null);
    }
    const updated = await this.applyStage(user, app, body.stage, rank, body.reason);
    if (body.email && body.stage !== app.stage) await this.sendEmail(user, id, body.email);
    return updated;
  }

  async bulk(user: AuthUser, body: BulkBody) {
    const apps = await this.prisma.application.findMany({ where: { id: { in: body.ids }, job: { companyId: user.companyId } } });
    for (const app of apps) {
      const last = await this.prisma.application.findFirst({ where: { jobId: app.jobId, stage: body.stage }, orderBy: { rank: "desc" } });
      await this.applyStage(user, app, body.stage, rankBetween(last?.rank ?? null, null), body.reason);
      if (body.email && app.stage !== body.stage) await this.sendEmail(user, app.id, body.email);
    }
    return { updated: apps.length };
  }

  async addNote(user: AuthUser, id: string, body: string) {
    const app = await this.find(user.companyId, id);
    const activity = await this.prisma.activity.create({
      data: { applicationId: id, actorId: user.userId, type: "note", data: { body } },
      include: { actor: { select: { id: true, name: true } } },
    });
    await this.events.publish({ companyId: user.companyId, type: "activity.created", jobId: app.jobId, applicationId: id, actorId: user.userId });
    return activity;
  }

  async rescore(companyId: string, id: string) {
    const app = await this.find(companyId, id);
    await this.prisma.application.update({ where: { id }, data: { aiStatus: "PENDING", aiError: null } });
    await this.cvQueue.add("analyze", { applicationId: id });
    await this.events.publish({ companyId, type: "application.updated", jobId: app.jobId, applicationId: id });
    return { queued: true };
  }

  async sendEmail(user: AuthUser, id: string, template: TemplateKey, override?: { subject?: string; body?: string }) {
    await this.find(user.companyId, id);
    const email = await this.emails.send(id, template, override);
    await this.prisma.activity.create({
      data: { applicationId: id, actorId: user.userId, type: "email", data: { template, subject: email.subject } },
    });
    return email;
  }

  async previewEmail(companyId: string, id: string, template: TemplateKey) {
    await this.find(companyId, id);
    const { companyId: _c, ...preview } = await this.emails.preview(id, template);
    return preview;
  }

  /** Seçilen adayları kriter bazında yan yana getirir. */
  async compare(companyId: string, ids: string[]) {
    const apps = await this.prisma.application.findMany({
      where: { id: { in: ids.slice(0, 4) }, job: { companyId } },
      select: { ...cardSelect, job: { select: { id: true, title: true, requirements: { orderBy: { position: "asc" } } } } },
    });
    return apps.map(({ job, ...a }) => ({ ...toCard(a), analysis: a.analysis, job }));
  }

  private async find(companyId: string, id: string) {
    const app = await this.prisma.application.findFirst({ where: { id, job: { companyId } } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    return app;
  }

  private async applyStage(
    user: AuthUser,
    app: { id: string; jobId: string; stage: Stage; maxStage: Stage },
    stage: Stage,
    rank: number,
    reason?: string,
  ) {
    const changed = stage !== app.stage;
    const updated = await this.prisma.application.update({
      where: { id: app.id },
      data: {
        stage,
        rank,
        ...(changed
          ? {
              stageChangedAt: new Date(),
              maxStage: furthest(app.maxStage, stage),
              rejectReason: stage === "REJECTED" ? (reason ?? null) : null,
              hiredAt: stage === "HIRED" ? new Date() : null,
            }
          : {}),
      },
      select: cardSelect,
    });
    if (changed) {
      await this.prisma.activity.create({
        data: { applicationId: app.id, actorId: user.userId, type: "stage", data: { from: app.stage, to: stage, ...(reason ? { reason } : {}) } },
      });
    }
    await this.events.publish({
      companyId: user.companyId,
      type: "application.moved",
      jobId: app.jobId,
      applicationId: app.id,
      actorId: user.userId,
      data: { stage, rank },
    });
    return toCard(updated);
  }
}
