import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { JobStatus, Prisma, Stage } from "@prisma/client";
import type { Queue } from "bullmq";
import { keywordsFrom } from "../ai/text";
import { PrismaService } from "../common/prisma.service";
import { slugify } from "../common/util";
import { CV_QUEUE, type CvJob } from "../queue/queues";
import type { JobBody } from "./jobs.schema";

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CV_QUEUE) private readonly cvQueue: Queue<CvJob>,
  ) {}

  async list(companyId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { applications: true } } },
    });
    const stats = await this.prisma.application.groupBy({
      by: ["jobId", "stage"],
      where: { job: { companyId } },
      _count: true,
      _avg: { score: true },
    });
    const since = new Date(Date.now() - 86400_000);
    const fresh = await this.prisma.application.groupBy({
      by: ["jobId"],
      where: { job: { companyId }, createdAt: { gte: since } },
      _count: true,
    });
    return jobs.map((j) => {
      const rows = stats.filter((s) => s.jobId === j.id);
      const stages = Object.fromEntries(rows.map((r) => [r.stage, r._count])) as Partial<Record<Stage, number>>;
      const scored = rows.filter((r) => r._avg.score != null);
      const avg = scored.length ? scored.reduce((s, r) => s + r._avg.score! * r._count, 0) / scored.reduce((s, r) => s + r._count, 0) : null;
      return {
        ...j,
        applicationCount: j._count.applications,
        newToday: fresh.find((f) => f.jobId === j.id)?._count ?? 0,
        stages,
        avgScore: avg == null ? null : Math.round(avg),
        _count: undefined,
      };
    });
  }

  async get(companyId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, companyId },
      include: { requirements: { orderBy: { position: "asc" } } },
    });
    if (!job) throw new NotFoundException("İlan bulunamadı.");
    return job;
  }

  async create(companyId: string, body: JobBody) {
    const slug = await this.uniqueSlug(companyId, body.title);
    return this.prisma.job.create({
      data: {
        ...this.fields(body),
        companyId,
        slug,
        publishedAt: body.status === "OPEN" ? new Date() : null,
        requirements: { create: this.reqs(body) },
      },
      include: { requirements: { orderBy: { position: "asc" } } },
    });
  }

  async update(companyId: string, id: string, body: JobBody) {
    const job = await this.get(companyId, id);
    const keep = body.requirements.filter((r) => r.id).map((r) => r.id!);
    if (keep.some((rid) => !job.requirements.some((r) => r.id === rid))) throw new BadRequestException("Geçersiz kriter.");

    const reqsChanged =
      keep.length !== job.requirements.length ||
      body.requirements.some((r) => {
        const old = job.requirements.find((o) => o.id === r.id);
        return !old || old.text !== r.text || old.weight !== r.weight || old.mustHave !== r.mustHave;
      });

    await this.prisma.$transaction([
      this.prisma.requirement.deleteMany({ where: { jobId: id, id: { notIn: keep } } }),
      ...body.requirements.map((r, position) => {
        const data = { text: r.text, weight: r.weight, mustHave: r.mustHave, keywords: r.keywords?.length ? r.keywords : keywordsFrom(r.text), position };
        return r.id
          ? this.prisma.requirement.update({ where: { id: r.id }, data })
          : this.prisma.requirement.create({ data: { ...data, jobId: id } });
      }),
      this.prisma.job.update({ where: { id }, data: this.statusPatch(job.status, body.status, this.fields(body)) }),
    ]);
    return { ...(await this.get(companyId, id)), requirementsChanged: reqsChanged };
  }

  async setStatus(companyId: string, id: string, status: JobStatus) {
    const job = await this.get(companyId, id);
    return this.prisma.job.update({ where: { id }, data: this.statusPatch(job.status, status, {}) });
  }

  /** Kriterler değiştiğinde ilandaki tüm başvuruları yeniden puanlamaya gönderir. */
  async rescore(companyId: string, id: string) {
    await this.get(companyId, id);
    const apps = await this.prisma.application.findMany({ where: { jobId: id }, select: { id: true } });
    await this.prisma.application.updateMany({ where: { jobId: id }, data: { aiStatus: "PENDING" } });
    await this.cvQueue.addBulk(apps.map((a) => ({ name: "analyze", data: { applicationId: a.id } })));
    return { queued: apps.length };
  }

  async remove(companyId: string, id: string) {
    await this.get(companyId, id);
    await this.prisma.job.delete({ where: { id } });
  }

  private fields(body: JobBody) {
    const { requirements: _r, ...rest } = body;
    return rest;
  }

  private statusPatch(from: JobStatus, to: JobStatus, data: Prisma.JobUpdateInput): Prisma.JobUpdateInput {
    if (from === to) return { ...data, status: to };
    return {
      ...data,
      status: to,
      ...(to === "OPEN" ? { publishedAt: new Date(), closedAt: null } : {}),
      ...(to === "CLOSED" ? { closedAt: new Date() } : {}),
    };
  }

  private reqs(body: JobBody) {
    return body.requirements.map((r, position) => ({
      text: r.text,
      weight: r.weight,
      mustHave: r.mustHave,
      keywords: r.keywords?.length ? r.keywords : keywordsFrom(r.text),
      position,
    }));
  }

  private async uniqueSlug(companyId: string, title: string) {
    const base = slugify(title) || "ilan";
    for (let i = 0; ; i++) {
      const slug = i ? `${base}-${i + 1}` : base;
      if (!(await this.prisma.job.findUnique({ where: { companyId_slug: { companyId, slug } } }))) return slug;
    }
  }
}
