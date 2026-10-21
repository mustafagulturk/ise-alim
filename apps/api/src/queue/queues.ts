import { BullModule } from "@nestjs/bullmq";
import { config } from "../common/config";

export const CV_QUEUE = "cv-analysis";
export const EMAIL_QUEUE = "email";

export interface CvJob {
  applicationId: string;
}

export interface EmailJob {
  emailId: string;
}

export function redisConnection() {
  const url = new URL(config().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
  };
}

export const QueueRoot = BullModule.forRoot({
  connection: redisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const Queues = BullModule.registerQueue({ name: CV_QUEUE }, { name: EMAIL_QUEUE });
