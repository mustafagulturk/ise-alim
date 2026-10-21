import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { config } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { EMAIL_QUEUE, type EmailJob } from "../queue/queues";
import { TEMPLATES, type TemplateKey, render } from "./templates";

/**
 * Giden e-postalar önce veritabanına (giden kutusu) yazılır, sonra kuyruktan gönderilir.
 * Böylece SMTP geçici olarak çökse bile hiçbir bildirim kaybolmaz ve panelde geçmişi görünür.
 */
@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailJob>,
  ) {}

  async preview(applicationId: string, template: TemplateKey) {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { candidate: true, job: { include: { company: true } } },
    });
    const vars = {
      aday: app.candidate.name.split(" ")[0],
      pozisyon: app.job.title,
      sirket: app.job.company.name,
      takip_linki: `${config().WEB_ORIGIN}/basvuru/${app.trackingToken}`,
    };
    const t = TEMPLATES[template];
    return { to: app.candidate.email, subject: render(t.subject, vars), body: render(t.body, vars), companyId: app.job.companyId };
  }

  async send(applicationId: string, template: TemplateKey, override?: { subject?: string; body?: string }) {
    const p = await this.preview(applicationId, template);
    const email = await this.prisma.emailMessage.create({
      data: {
        companyId: p.companyId,
        applicationId,
        to: p.to,
        template,
        subject: override?.subject || p.subject,
        body: override?.body || p.body,
      },
    });
    await this.queue.add("send", { emailId: email.id }, { jobId: email.id });
    return email;
  }
}
