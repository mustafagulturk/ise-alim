import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AnalyticsController } from "./analytics/analytics.controller";
import { AnalyticsService } from "./analytics/analytics.service";
import { ApplicationsController } from "./applications/applications.controller";
import { ApplicationsService } from "./applications/applications.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { CareersController } from "./careers/careers.controller";
import { CareersService } from "./careers/careers.service";
import { AuthGuard } from "./common/auth";
import { config } from "./common/config";
import { EventsModule } from "./common/events";
import { PrismaModule } from "./common/prisma.service";
import { StorageModule } from "./common/storage.service";
import { CompaniesController } from "./companies/companies.controller";
import { EmailsService } from "./emails/emails.service";
import { HealthController } from "./health.controller";
import { InterviewsController } from "./interviews/interviews.controller";
import { InterviewsService } from "./interviews/interviews.service";
import { InvitesService } from "./interviews/invites.service";
import { JobsController } from "./jobs/jobs.controller";
import { JobsService } from "./jobs/jobs.service";
import { QueueRoot, Queues } from "./queue/queues";
import { LiveGateway } from "./realtime/live.gateway";
import { TalentController } from "./talent/talent.controller";
import { TalentService } from "./talent/talent.service";

export const Jwt = JwtModule.register({ global: true, secret: config().JWT_SECRET, signOptions: { expiresIn: "15m" } });

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    EventsModule,
    Jwt,
    QueueRoot,
    Queues,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 300 }], skipIf: () => config().NODE_ENV === "test" }),
  ],
  controllers: [
    HealthController,
    AuthController,
    CompaniesController,
    JobsController,
    ApplicationsController,
    CareersController,
    InterviewsController,
    AnalyticsController,
    TalentController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    AuthService,
    JobsService,
    ApplicationsService,
    CareersService,
    InterviewsService,
    InvitesService,
    TalentService,
    AnalyticsService,
    EmailsService,
    LiveGateway,
  ],
})
export class AppModule {}
