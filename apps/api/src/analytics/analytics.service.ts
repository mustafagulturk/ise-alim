import { Injectable } from "@nestjs/common";
import { Prisma, type Stage } from "@prisma/client";
import { PIPELINE, stageIndex } from "../applications/stages";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(companyId: string, jobId?: string, days = 30) {
    const where: Prisma.ApplicationWhereInput = { job: { companyId }, ...(jobId ? { jobId } : {}) };
    const since = new Date(Date.now() - days * 86400_000);
    const jobFilter = jobId ? Prisma.sql`AND a."jobId" = ${jobId}` : Prisma.empty;

    const [byMax, byStage, bySource, perDay, buckets, hired, providers, openJobs, upcoming] = await Promise.all([
      this.prisma.application.groupBy({ by: ["maxStage"], where, _count: true }),
      this.prisma.application.groupBy({ by: ["stage"], where, _count: true }),
      this.prisma.application.groupBy({ by: ["source"], where, _count: true, orderBy: { _count: { source: "desc" } } }),
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', a."createdAt") AS day, count(*) AS count
        FROM "Application" a JOIN "Job" j ON j.id = a."jobId"
        WHERE j."companyId" = ${companyId} AND a."createdAt" >= ${since} ${jobFilter}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ bucket: number; count: bigint }[]>`
        SELECT least(floor(a.score / 20), 4)::int AS bucket, count(*) AS count
        FROM "Application" a JOIN "Job" j ON j.id = a."jobId"
        WHERE j."companyId" = ${companyId} AND a.score IS NOT NULL ${jobFilter}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.application.findMany({ where: { ...where, hiredAt: { not: null } }, select: { createdAt: true, hiredAt: true } }),
      this.prisma.application.groupBy({ by: ["provider"], where: { ...where, aiStatus: "DONE" }, _count: true }),
      this.prisma.job.count({ where: { companyId, status: "OPEN", ...(jobId ? { id: jobId } : {}) } }),
      this.prisma.interview.count({ where: { application: where, cancelledAt: null, startsAt: { gte: new Date() } } }),
    ]);

    // Huni: bir aşamaya ulaşan başvuru sayısı = en ileri aşaması o ya da sonrası olanlar.
    const funnel = PIPELINE.map((stage) => ({
      stage,
      count: byMax.filter((r) => stageIndex(r.maxStage) >= stageIndex(stage)).reduce((s, r) => s + r._count, 0),
    }));

    const counts = new Map(perDay.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    const daily = Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400_000).toISOString().slice(0, 10);
      return { day: d, count: counts.get(d) ?? 0 };
    });

    const total = byStage.reduce((s, r) => s + r._count, 0);
    const hireDays = hired.map((h) => (h.hiredAt!.getTime() - h.createdAt.getTime()) / 86400_000);
    const labels = ["0-19", "20-39", "40-59", "60-79", "80-100"];

    return {
      totals: {
        applications: total,
        openJobs,
        upcomingInterviews: upcoming,
        hired: hired.length,
        avgTimeToHire: hireDays.length ? Math.round(hireDays.reduce((a, b) => a + b, 0) / hireDays.length) : null,
        last7: daily.slice(-7).reduce((s, d) => s + d.count, 0),
      },
      funnel,
      stages: Object.fromEntries(byStage.map((r) => [r.stage, r._count])) as Partial<Record<Stage, number>>,
      sources: bySource.map((s) => ({ source: s.source, count: s._count })),
      daily,
      scores: labels.map((label, i) => ({ label, count: Number(buckets.find((b) => b.bucket === i)?.count ?? 0) })),
      providers: providers.map((p) => ({ provider: p.provider ?? "bilinmiyor", count: p._count })),
    };
  }
}
