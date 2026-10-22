import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Analysis } from "../ai/analysis";
import { anonymize } from "../ai/anonymize";
import { aiModel, anthropic } from "../ai/client";
import { type StoredKit, claudeKit, localKit } from "../ai/interview-kit";
import type { AuthUser } from "../common/auth";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { ics } from "./ics";
import type { InterviewBody, ScorecardBody } from "./interviews.schema";

const include = {
  panelists: { include: { user: { select: { id: true, name: true } } } },
  scorecards: { include: { author: { select: { id: true, name: true } } } },
  application: {
    select: { id: true, stage: true, score: true, candidate: { select: { name: true, email: true } }, job: { select: { id: true, title: true } } },
  },
} as const;

@Injectable()
export class InterviewsService {
  private readonly log = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  list(user: AuthUser, from?: Date, to?: Date, mine = false) {
    return this.prisma.interview.findMany({
      where: {
        application: { job: { companyId: user.companyId } },
        startsAt: { gte: from ?? new Date(Date.now() - 7 * 86400_000), ...(to ? { lte: to } : {}) },
        ...(mine ? { panelists: { some: { userId: user.userId } } } : {}),
      },
      orderBy: { startsAt: "asc" },
      include,
    });
  }

  async create(user: AuthUser, applicationId: string, body: InterviewBody) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, job: { companyId: user.companyId } } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    const members = await this.prisma.membership.count({ where: { companyId: user.companyId, userId: { in: body.panelistIds } } });
    if (members !== body.panelistIds.length) throw new BadRequestException("Mülakatçılar şirket üyesi olmalı.");

    const interview = await this.prisma.interview.create({
      data: {
        applicationId,
        title: body.title,
        startsAt: new Date(body.startsAt),
        durationMin: body.durationMin,
        location: body.location,
        panelists: { create: body.panelistIds.map((userId) => ({ userId })) },
      },
      include,
    });
    await this.prisma.activity.create({
      data: { applicationId, actorId: user.userId, type: "interview", data: { title: body.title, startsAt: body.startsAt } },
    });
    await this.events.publish({ companyId: user.companyId, type: "activity.created", jobId: app.jobId, applicationId });
    const kit = await this.prepareKit(user.companyId, interview.id);
    return { ...interview, kit };
  }

  /** Önce anında yerel kit yazılır; Claude varsa arka planda daha iyisiyle değiştirilir ve panel canlı tazelenir. */
  async prepareKit(companyId: string, interviewId: string) {
    const kit = await this.generateKit(companyId, interviewId, false);
    if (anthropic()) void this.generateKit(companyId, interviewId, true).catch((e) => this.log.warn(`Mülakat kiti hazırlanamadı: ${e}`));
    return kit;
  }

  /** Mülakat kitini (yeniden) üretir. Yalnızca İK, şirket sahibi ya da o mülakatın mülakatçısı isteyebilir. */
  async kit(user: AuthUser, id: string) {
    const iv = await this.find(user, id);
    if (user.role === "INTERVIEWER" && !iv.panelists.some((p) => p.userId === user.userId)) {
      throw new ForbiddenException("Yalnızca bu mülakatın mülakatçıları kit hazırlayabilir.");
    }
    return this.generateKit(user.companyId, id, true);
  }

  private async generateKit(companyId: string, id: string, useClaude: boolean): Promise<StoredKit> {
    const iv = await this.prisma.interview.findUniqueOrThrow({
      where: { id },
      include: {
        application: {
          include: {
            candidate: { select: { name: true } },
            job: { include: { requirements: { orderBy: { position: "asc" } } } },
            interviews: { where: { id: { not: id } }, include: { scorecards: true } },
          },
        },
      },
    });
    const app = iv.application;
    const input = {
      jobTitle: app.job.title,
      interviewTitle: iv.title,
      durationMin: iv.durationMin,
      analysis: app.analysis as Analysis | null,
      requirements: app.job.requirements.map(({ id: rid, text, keywords, weight, mustHave }) => ({ id: rid, text, keywords, weight, mustHave })),
      previousNotes: app.interviews.flatMap((o) => o.scorecards.map((s) => ({ interview: o.title, recommendation: s.recommendation, notes: s.notes }))),
      cvText: anonymize(app.cvText, app.candidate.name),
    };

    let kit: StoredKit | null = null;
    const client = useClaude ? anthropic() : null;
    if (client) {
      try {
        kit = { ...(await claudeKit(client, aiModel(), input)), provider: "claude", model: aiModel(), generatedAt: new Date().toISOString() };
      } catch (e) {
        this.log.warn(`Claude ile kit hazırlanamadı, yerel şablon kullanılıyor: ${e}`);
      }
    }
    kit ??= { ...localKit(input), provider: "local", generatedAt: new Date().toISOString() };

    await this.prisma.interview.update({ where: { id }, data: { kit: kit as unknown as Prisma.InputJsonValue } });
    await this.events.publish({ companyId, type: "activity.created", jobId: app.jobId, applicationId: app.id });
    return kit;
  }

  async cancel(user: AuthUser, id: string) {
    const iv = await this.find(user, id);
    return this.prisma.interview.update({ where: { id: iv.id }, data: { cancelledAt: new Date() }, include });
  }

  /** Değerlendirme formu: yalnızca mülakatçılar (ve şirket sahibi) doldurabilir, her kişi bir kez (güncelleyebilir). */
  async scorecard(user: AuthUser, id: string, body: ScorecardBody) {
    const iv = await this.find(user, id);
    const isPanelist = iv.panelists.some((p) => p.userId === user.userId);
    if (!isPanelist && user.role !== "OWNER") throw new ForbiddenException("Yalnızca mülakatçılar değerlendirme girebilir.");

    const card = await this.prisma.scorecard.upsert({
      where: { interviewId_authorId: { interviewId: id, authorId: user.userId } },
      create: { interviewId: id, authorId: user.userId, ...body },
      update: body,
      include: { author: { select: { id: true, name: true } } },
    });
    await this.prisma.activity.create({
      data: { applicationId: iv.applicationId, actorId: user.userId, type: "scorecard", data: { recommendation: body.recommendation, interview: iv.title } },
    });
    await this.events.publish({ companyId: user.companyId, type: "activity.created", applicationId: iv.applicationId });
    return card;
  }

  async calendar(user: AuthUser, id: string) {
    const iv = await this.find(user, id);
    return ics({
      id: iv.id,
      title: `${iv.title}: ${iv.application.candidate.name}`,
      startsAt: iv.startsAt,
      durationMin: iv.durationMin,
      location: iv.location,
      description: `${iv.application.job.title} pozisyonu mülakatı\nMülakatçılar: ${iv.panelists.map((p) => p.user.name).join(", ")}`,
    });
  }

  private async find(user: AuthUser, id: string) {
    const iv = await this.prisma.interview.findFirst({ where: { id, application: { job: { companyId: user.companyId } } }, include });
    if (!iv) throw new NotFoundException("Mülakat bulunamadı.");
    return iv;
  }
}
