import { Controller, Get, Param, Post } from "@nestjs/common";
import { type AuthUser, CurrentUser, Roles } from "../common/auth";
import { TalentService } from "./talent.service";

@Controller()
export class TalentController {
  constructor(private readonly talent: TalentService) {}

  @Get("jobs/:id/talent-pool")
  forJob(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.talent.forJob(u.companyId, id);
  }

  @Roles("OWNER", "RECRUITER")
  @Post("jobs/:id/talent-pool/:candidateId")
  add(@CurrentUser() u: AuthUser, @Param("id") id: string, @Param("candidateId") candidateId: string) {
    return this.talent.add(u, id, candidateId);
  }

  @Get("applications/:id/matches")
  matches(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.talent.forApplication(u.companyId, id);
  }
}
