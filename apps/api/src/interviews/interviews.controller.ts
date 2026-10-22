import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { type AuthUser, CurrentUser, Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { InterviewBody, InviteBody, SCORECARD_CRITERIA, ScorecardBody, SlotQuery } from "./interviews.schema";
import { InterviewsService } from "./interviews.service";
import { InvitesService } from "./invites.service";

@Controller()
export class InterviewsController {
  constructor(
    private readonly interviews: InterviewsService,
    private readonly invites: InvitesService,
  ) {}

  @Get("interviews")
  list(@CurrentUser() u: AuthUser, @Query("from") from?: string, @Query("to") to?: string, @Query("mine") mine?: string) {
    return this.interviews.list(u, from ? new Date(from) : undefined, to ? new Date(to) : undefined, mine === "1");
  }

  @Get("interviews/criteria")
  criteria() {
    return SCORECARD_CRITERIA;
  }

  @Roles("OWNER", "RECRUITER")
  @Post("applications/:id/interviews")
  create(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(InterviewBody)) body: InterviewBody) {
    return this.interviews.create(u, id, body);
  }

  @Roles("OWNER", "RECRUITER")
  @Get("applications/:id/invite-slots")
  slots(@CurrentUser() u: AuthUser, @Param("id") id: string, @Query(new ZodPipe(SlotQuery)) q: SlotQuery) {
    return this.invites.suggest(u, id, q);
  }

  @Roles("OWNER", "RECRUITER")
  @Post("applications/:id/invites")
  invite(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(InviteBody)) body: InviteBody) {
    return this.invites.create(u, id, body);
  }

  @Roles("OWNER", "RECRUITER")
  @Patch("invites/:id/cancel")
  cancelInvite(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.invites.cancel(u, id);
  }

  @Roles("OWNER", "RECRUITER")
  @Patch("interviews/:id/cancel")
  cancel(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.interviews.cancel(u, id);
  }

  @Post("interviews/:id/kit")
  kit(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.interviews.kit(u, id);
  }

  @Put("interviews/:id/scorecard")
  scorecard(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ScorecardBody)) body: ScorecardBody) {
    return this.interviews.scorecard(u, id, body);
  }

  @Get("interviews/:id/ics")
  async ics(@CurrentUser() u: AuthUser, @Param("id") id: string, @Res() res: Response) {
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mulakat-${id}.ics"`);
    res.send(await this.interviews.calendar(u, id));
  }
}
