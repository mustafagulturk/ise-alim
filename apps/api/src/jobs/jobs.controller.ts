import Anthropic from "@anthropic-ai/sdk";
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { DEFAULT_MODEL } from "../ai/claude-scorer";
import { suggestRequirements } from "../ai/requirements-suggest";
import { type AuthUser, CurrentUser, Roles } from "../common/auth";
import { config } from "../common/config";
import { ZodPipe } from "../common/zod.pipe";
import { JobBody, SuggestBody } from "./jobs.schema";
import { JobsService } from "./jobs.service";

const StatusBody = z.object({ status: z.enum(["DRAFT", "OPEN", "CLOSED"]) });

@Controller("jobs")
export class JobsController {
  private readonly ai = config().ANTHROPIC_API_KEY ? new Anthropic({ apiKey: config().ANTHROPIC_API_KEY }) : null;

  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.jobs.list(u.companyId);
  }

  @Get(":id")
  get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.jobs.get(u.companyId, id);
  }

  @Roles("OWNER", "RECRUITER")
  @Post()
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(JobBody)) body: JobBody) {
    return this.jobs.create(u.companyId, body);
  }

  @Roles("OWNER", "RECRUITER")
  @Put(":id")
  update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(JobBody)) body: JobBody) {
    return this.jobs.update(u.companyId, id, body);
  }

  @Roles("OWNER", "RECRUITER")
  @Patch(":id/status")
  status(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(StatusBody)) body: z.infer<typeof StatusBody>) {
    return this.jobs.setStatus(u.companyId, id, body.status);
  }

  @Roles("OWNER", "RECRUITER")
  @HttpCode(202)
  @Post(":id/rescore")
  rescore(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.jobs.rescore(u.companyId, id);
  }

  @Roles("OWNER")
  @HttpCode(204)
  @Delete(":id")
  remove(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.jobs.remove(u.companyId, id);
  }

  @Roles("OWNER", "RECRUITER")
  @HttpCode(200)
  @Post("suggest-requirements")
  suggest(@Body(new ZodPipe(SuggestBody)) body: z.infer<typeof SuggestBody>) {
    return suggestRequirements(this.ai, config().ANTHROPIC_MODEL || DEFAULT_MODEL, body.title, body.description);
  }
}
