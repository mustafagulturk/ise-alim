import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, type Stage } from "@prisma/client";
import { furthest, stageIndex } from "../applications/stages";
import type { AuthUser } from "../common/auth";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { EmailsService } from "../emails/emails.service";
import { type Busy, formatLocal, freeSlots, groupByDay, overlaps, spread } from "./availability";
import { ics } from "./ics";
import { InterviewsService } from "./interviews.service";
import type { InviteBody, SlotQuery } from "./interviews.schema";

const DAY = 86400_000;
const SEARCH_DAYS = 10;

/**
 * Aday kendi mülakat saatini seçer: İK mülakatçıların boş saatlerinden seçenek gönderir,
 * aday takip sayfasından birini seçince mülakat oluşur. E-posta trafiği ve takvim çakışması ortadan kalkar.
 */
@Injectable()
export class InvitesService {
  private readonly log = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly emails: EmailsService,
    private readonly interviews: InterviewsService,
  ) {}

  /**
   * Mülakatçıların dolu saatleri. `holds` açıkken başka adaylara gönderilmiş ve henüz cevaplanmamış seçenekler de
   * dolu sayılır (öneri yaparken çift teklif olmasın diye); aday seçim yaparken yalnızca kesinleşmiş mülakatlar engeldir.
   */
  async busy(panelistIds: string[], from: Date, to: Date, holds: { except?: string } | false, db: Prisma.TransactionClient = this.prisma): Promise<Busy[]> {
    const [interviews, invites] = await Promise.all([
      db.interview.findMany({
        where: { cancelledAt: null, startsAt: { gte: new Date(from.getTime() - DAY), lte: to }, panelists: { some: { userId: { in: panelistIds } } } },
        select: { startsAt: true, durationMin: true },
      }),
      holds
        ? db.interviewInvite.findMany({
            where: { status: "PENDING", panelistIds: { hasSome: panelistIds }, ...(holds.except ? { id: { not: holds.except } } : {}) },
            select: { slots: true, durationMin: true },
          })
        : [],
    ]);
    return [
      ...interviews.map((i) => ({ start: i.startsAt, end: new Date(i.startsAt.getTime() + i.durationMin * 60_000) })),
      ...invites.flatMap((inv) => inv.slots.map((s) => ({ start: s, end: new Date(s.getTime() + inv.durationMin * 60_000) }))),
    ];
  }

  async suggest(user: AuthUser, applicationId: string, q: SlotQuery) {
    await this.findApplication(user.companyId, applicationId);
    await this.assertMembers(user.companyId, q.panelistIds);
    const now = new Date();
    const pending = await this.prisma.interviewInvite.findFirst({ where: { applicationId, status: "PENDING" }, select: { id: true } });
    const busy = await this.busy(q.panelistIds, now, new Date(now.getTime() + (SEARCH_DAYS + 1) * DAY), { except: pending?.id });
    const slots = freeSlots(busy, { durationMin: q.durationMin, from: now, days: SEARCH_DAYS });
    return { days: groupByDay(slots), suggested: spread(slots, 6).map((d) => d.toISOString()) };
  }

  async create(user: AuthUser, applicationId: string, body: InviteBody) {
    const app = await this.findApplication(user.companyId, applicationId);
    await this.assertMembers(user.companyId, body.panelistIds);
    const slots = [...new Set(body.slots)].map((s) => new Date(s)).sort((a, b) => a.getTime() - b.getTime());
    if (slots.some((s) => s.getTime() < Date.now() + 3600_000)) throw new BadRequestException({ message: "Geçmiş ya da çok yakın saat seçilemez.", fields: { slots: "En erken bir saat sonrası seçilebilir." } });

    const invite = await this.prisma.$transaction(async (tx) => {
      // Aynı adaya bekleyen eski davet varsa yenisi onun yerini alır.
      await tx.interviewInvite.updateMany({ where: { applicationId, status: "PENDING" }, data: { status: "CANCELLED" } });
      return tx.interviewInvite.create({
        data: { applicationId, createdById: user.userId, title: body.title, durationMin: body.durationMin, location: body.location, panelistIds: body.panelistIds, slots },
      });
    });
    await this.prisma.activity.create({
      data: { applicationId, actorId: user.userId, type: "invite", data: { title: body.title, options: slots.length } },
    });
    if (body.sendEmail) await this.emails.send(applicationId, "schedule", undefined, { mulakat: body.title.toLocaleLowerCase("tr") });
    await this.events.publish({ companyId: user.companyId, type: "activity.created", jobId: app.jobId, applicationId, actorId: user.userId });
    return invite;
  }

  async cancel(user: AuthUser, id: string) {
    const invite = await this.prisma.interviewInvite.findFirst({ where: { id, application: { job: { companyId: user.companyId } } }, include: { application: true } });
    if (!invite) throw new NotFoundException("Davet bulunamadı.");
    if (invite.status !== "PENDING") throw new BadRequestException("Bu davet artık beklemede değil.");
    const updated = await this.prisma.interviewInvite.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.events.publish({ companyId: user.companyId, type: "activity.created", jobId: invite.application.jobId, applicationId: invite.applicationId, actorId: user.userId });
    return updated;
  }

  /** Takip sayfası için bekleyen davet; her seçeneğin hâlâ boş olup olmadığı o an hesaplanır. */
  async forCandidate(applicationId: string) {
    const invite = await this.prisma.interviewInvite.findFirst({ where: { applicationId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (!invite) return null;
    const now = new Date();
    const last = invite.slots.at(-1) ?? now;
    const busy = await this.busy(invite.panelistIds, now, new Date(last.getTime() + DAY), false);
    return {
      id: invite.id,
      title: invite.title,
      durationMin: invite.durationMin,
      location: invite.location,
      slots: invite.slots.map((s) => ({
        startsAt: s.toISOString(),
        available: s.getTime() > now.getTime() + 3600_000 && !busy.some((b) => overlaps(b, { start: s, end: new Date(s.getTime() + invite.durationMin * 60_000) })),
      })),
    };
  }

  /**
   * Aday bir saati seçer. Seri hale getirilmiş işlem içinde çakışma tekrar kontrol edilir; iki aday aynı anda
   * aynı mülakatçının aynı saatini seçerse biri kazanır, diğeri "saat doldu" cevabı alır.
   */
  async book(trackingToken: string, startsAt: string) {
    const app = await this.prisma.application.findUnique({ where: { trackingToken }, include: { job: true, candidate: true } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    if (app.stage === "REJECTED" || app.stage === "HIRED") throw new BadRequestException("Bu başvuru sonuçlanmış.");
    const start = new Date(startsAt);

    let result: { interviewId: string; from: Stage; to: Stage };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const invite = await tx.interviewInvite.findFirst({ where: { applicationId: app.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
          if (!invite) throw new BadRequestException("Bekleyen bir mülakat daveti yok.");
          if (!invite.slots.some((s) => s.getTime() === start.getTime())) throw new BadRequestException("Bu saat davette yer almıyor.");
          if (start.getTime() < Date.now() + 3600_000) throw new BadRequestException("Bu saatin süresi geçti.");

          const slot = { start, end: new Date(start.getTime() + invite.durationMin * 60_000) };
          const busy = await this.busy(invite.panelistIds, start, slot.end, false, tx);
          if (busy.some((b) => overlaps(b, slot))) throw new ConflictException("Bu saat az önce doldu, lütfen başka bir saat seçin.");

          const interview = await tx.interview.create({
            data: {
              applicationId: app.id,
              title: invite.title,
              startsAt: start,
              durationMin: invite.durationMin,
              location: invite.location,
              panelists: { create: invite.panelistIds.map((userId) => ({ userId })) },
            },
          });
          await tx.interviewInvite.update({ where: { id: invite.id }, data: { status: "BOOKED", interviewId: interview.id, bookedAt: new Date() } });
          await tx.activity.create({ data: { applicationId: app.id, type: "booked", data: { title: invite.title, startsAt: start.toISOString() } } });

          // Saat seçen aday henüz mülakat aşamasında değilse oraya taşınır.
          const to: Stage = stageIndex(app.stage) >= 0 && stageIndex(app.stage) < stageIndex("INTERVIEW") ? "INTERVIEW" : app.stage;
          if (to !== app.stage) {
            await tx.application.update({ where: { id: app.id }, data: { stage: to, maxStage: furthest(app.maxStage, to), stageChangedAt: new Date() } });
            await tx.activity.create({ data: { applicationId: app.id, type: "stage", data: { from: app.stage, to } } });
          }
          return { interviewId: interview.id, from: app.stage, to };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
        throw new ConflictException("Bu saat az önce doldu, lütfen başka bir saat seçin.");
      }
      throw e;
    }

    const interview = await this.prisma.interview.findUniqueOrThrow({ where: { id: result.interviewId } });
    await this.interviews.prepareKit(app.job.companyId, interview.id).catch((e) => this.log.warn(`Kit hazırlanamadı: ${e}`));
    await this.emails.send(app.id, "confirmed", undefined, {
      mulakat: interview.title.toLocaleLowerCase("tr"),
      tarih: formatLocal(interview.startsAt),
      sure: String(interview.durationMin),
      yer: interview.location,
    });
    await this.events.publish({
      companyId: app.job.companyId,
      type: "interview.booked",
      jobId: app.jobId,
      applicationId: app.id,
      data: { name: app.candidate.name, startsAt: interview.startsAt.toISOString(), stage: result.to },
    });
    return { id: interview.id, title: interview.title, startsAt: interview.startsAt, durationMin: interview.durationMin, location: interview.location };
  }

  /** Adayın kendi mülakatı için takvim dosyası (takip bağlantısıyla, oturum gerektirmez). */
  async candidateIcs(trackingToken: string, interviewId: string) {
    const iv = await this.prisma.interview.findFirst({
      where: { id: interviewId, cancelledAt: null, application: { trackingToken } },
      include: { application: { include: { job: { include: { company: true } } } } },
    });
    if (!iv) throw new NotFoundException("Mülakat bulunamadı.");
    return ics({
      id: iv.id,
      title: `${iv.application.job.company.name} · ${iv.title}`,
      startsAt: iv.startsAt,
      durationMin: iv.durationMin,
      location: iv.location,
      description: `${iv.application.job.title} pozisyonu mülakatı`,
    });
  }

  private async findApplication(companyId: string, id: string) {
    const app = await this.prisma.application.findFirst({ where: { id, job: { companyId } } });
    if (!app) throw new NotFoundException("Başvuru bulunamadı.");
    return app;
  }

  private async assertMembers(companyId: string, userIds: string[]) {
    const n = await this.prisma.membership.count({ where: { companyId, userId: { in: userIds } } });
    if (n !== new Set(userIds).size) throw new BadRequestException({ message: "Mülakatçılar şirket üyesi olmalı.", fields: { panelistIds: "Geçersiz mülakatçı." } });
  }
}
