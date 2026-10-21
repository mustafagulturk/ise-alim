import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrismaService } from "../common/prisma.service";
import { EMAIL_QUEUE, type EmailJob } from "./queues";

/**
 * Giden kutusundaki e-postayı gönderir. Demo ortamında SMTP yerine günlüğe yazar;
 * gerçek ortamda burada bir SMTP / e-posta servisi çağrılır. Kayıt ve tekrar deneme mantığı aynı kalır.
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly log = new Logger(EmailProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<EmailJob>) {
    const email = await this.prisma.emailMessage.findUnique({ where: { id: job.data.emailId } });
    if (!email || email.status === "SENT") return;
    this.log.log(`E-posta -> ${email.to}: ${email.subject}`);
    await this.prisma.emailMessage.update({ where: { id: email.id }, data: { status: "SENT", sentAt: new Date() } });
  }
}
