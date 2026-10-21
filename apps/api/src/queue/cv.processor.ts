import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Job } from "bullmq";
import { extractText } from "../ai/cv-text";
import { ScoringService } from "../ai/scoring.service";
import { EventsService } from "../common/events";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../common/storage.service";
import { CV_QUEUE, type CvJob } from "./queues";

/** CV'yi okur, metni çıkarır, puanlar ve sonucu canlı olarak panele bildirir. */
@Processor(CV_QUEUE, { concurrency: 4 })
export class CvProcessor extends WorkerHost {
  private readonly log = new Logger(CvProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scoring: ScoringService,
    private readonly events: EventsService,
  ) {
    super();
  }

  async process(job: Job<CvJob>) {
    const app = await this.prisma.application.findUnique({
      where: { id: job.data.applicationId },
      include: { candidate: true, job: { include: { requirements: { orderBy: { position: "asc" } } } } },
    });
    if (!app) return;

    await this.prisma.application.update({ where: { id: app.id }, data: { aiStatus: "PROCESSING" } });
    await this.notify(app.job.companyId, app.jobId, app.id, "application.updated");

    try {
      let text = app.cvText;
      if (!text) {
        text = await extractText(await this.storage.read(app.cvFileKey), app.cvMime);
        await this.prisma.application.update({ where: { id: app.id }, data: { cvText: text } });
      }
      const analysis = await this.scoring.assess(app.job, text, app.candidate.name);
      await this.prisma.$transaction([
        this.prisma.application.update({
          where: { id: app.id },
          data: {
            aiStatus: "DONE",
            aiError: null,
            score: analysis.score,
            provider: analysis.provider,
            analysis: analysis as unknown as Prisma.InputJsonValue,
          },
        }),
        this.prisma.activity.create({
          data: { applicationId: app.id, type: "scored", data: { score: analysis.score, provider: analysis.provider } },
        }),
      ]);
      this.log.log(`${app.id} puanlandı: ${analysis.score} (${analysis.provider}, ${analysis.durationMs} ms)`);
      await this.notify(app.job.companyId, app.jobId, app.id, "application.scored", { score: analysis.score });
    } catch (err) {
      const last = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.prisma.application.update({
        where: { id: app.id },
        data: { aiStatus: last ? "FAILED" : "PENDING", aiError: String(err).slice(0, 500) },
      });
      await this.notify(app.job.companyId, app.jobId, app.id, "application.updated");
      throw err;
    }
  }

  private notify(companyId: string, jobId: string, applicationId: string, type: "application.updated" | "application.scored", data?: Record<string, unknown>) {
    return this.events.publish({ companyId, jobId, applicationId, type, data });
  }
}
