import { Controller, Get, Query } from "@nestjs/common";
import { type AuthUser, CurrentUser } from "../common/auth";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  overview(@CurrentUser() u: AuthUser, @Query("jobId") jobId?: string, @Query("days") days?: string) {
    const d = Math.min(90, Math.max(7, Number(days) || 30));
    return this.analytics.overview(u.companyId, jobId || undefined, d);
  }
}
