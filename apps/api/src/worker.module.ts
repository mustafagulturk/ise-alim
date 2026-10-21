import { Module } from "@nestjs/common";
import { ScoringService } from "./ai/scoring.service";
import { EventsModule } from "./common/events";
import { PrismaModule } from "./common/prisma.service";
import { StorageModule } from "./common/storage.service";
import { CvProcessor } from "./queue/cv.processor";
import { EmailProcessor } from "./queue/email.processor";
import { QueueRoot, Queues } from "./queue/queues";

@Module({
  imports: [PrismaModule, StorageModule, EventsModule, QueueRoot, Queues],
  providers: [ScoringService, CvProcessor, EmailProcessor],
})
export class WorkerModule {}
