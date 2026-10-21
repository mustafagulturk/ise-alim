import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { type AuthUser, CurrentUser, Roles } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { BulkBody, EmailBody, ListQuery, MoveBody, NoteBody } from "./applications.schema";
import { ApplicationsService } from "./applications.service";

const TemplateQuery = z.object({ template: z.enum(["received", "interview", "offer", "rejected"]) });

@Controller()
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Get("jobs/:jobId/applications")
  board(@CurrentUser() u: AuthUser, @Param("jobId") jobId: string) {
    return this.apps.board(u.companyId, jobId);
  }

  @Get("applications")
  list(@CurrentUser() u: AuthUser, @Query(new ZodPipe(ListQuery)) q: ListQuery) {
    return this.apps.list(u.companyId, q);
  }

  @Get("applications/compare")
  compare(@CurrentUser() u: AuthUser, @Query("ids") ids = "") {
    return this.apps.compare(u.companyId, ids.split(",").filter(Boolean));
  }

  @Get("applications/:id")
  detail(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.apps.detail(u, id);
  }

  @Get("applications/:id/cv")
  async cv(@CurrentUser() u: AuthUser, @Param("id") id: string, @Res() res: Response) {
    const file = await this.apps.cv(u.companyId, id);
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(file.buffer);
  }

  @Roles("OWNER", "RECRUITER")
  @Patch("applications/:id/move")
  move(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(MoveBody)) body: MoveBody) {
    return this.apps.move(u, id, body);
  }

  @Roles("OWNER", "RECRUITER")
  @HttpCode(200)
  @Post("applications/bulk")
  bulk(@CurrentUser() u: AuthUser, @Body(new ZodPipe(BulkBody)) body: BulkBody) {
    return this.apps.bulk(u, body);
  }

  @Post("applications/:id/notes")
  note(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(NoteBody)) body: z.infer<typeof NoteBody>) {
    return this.apps.addNote(u, id, body.body);
  }

  @Roles("OWNER", "RECRUITER")
  @HttpCode(202)
  @Post("applications/:id/rescore")
  rescore(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.apps.rescore(u.companyId, id);
  }

  @Roles("OWNER", "RECRUITER")
  @Get("applications/:id/email-preview")
  preview(@CurrentUser() u: AuthUser, @Param("id") id: string, @Query(new ZodPipe(TemplateQuery)) q: z.infer<typeof TemplateQuery>) {
    return this.apps.previewEmail(u.companyId, id, q.template);
  }

  @Roles("OWNER", "RECRUITER")
  @Post("applications/:id/emails")
  email(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(EmailBody)) body: z.infer<typeof EmailBody>) {
    return this.apps.sendEmail(u, id, body.template, body);
  }
}
