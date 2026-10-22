import { Body, Controller, Get, HttpCode, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "../common/auth";
import { ZodPipe } from "../common/zod.pipe";
import { BookBody } from "../interviews/interviews.schema";
import { InvitesService } from "../interviews/invites.service";
import { ApplyBody } from "./careers.schema";
import { CareersService, MAX_CV_BYTES } from "./careers.service";

@Public()
@Controller()
export class CareersController {
  constructor(
    private readonly careers: CareersService,
    private readonly invites: InvitesService,
  ) {}

  @Get("careers/:slug")
  company(@Param("slug") slug: string) {
    return this.careers.company(slug);
  }

  @Get("careers/:slug/jobs/:jobSlug")
  job(@Param("slug") slug: string, @Param("jobSlug") jobSlug: string) {
    return this.careers.job(slug, jobSlug);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("careers/:slug/jobs/:jobSlug/apply")
  @UseInterceptors(FileInterceptor("cv", { limits: { fileSize: MAX_CV_BYTES + 1, files: 1 } }))
  apply(
    @Param("slug") slug: string,
    @Param("jobSlug") jobSlug: string,
    @Body(new ZodPipe(ApplyBody)) body: ApplyBody,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.careers.apply(slug, jobSlug, body, file);
  }

  @Get("track/:token")
  track(@Param("token") token: string) {
    return this.careers.track(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("track/:token/withdraw")
  withdraw(@Param("token") token: string) {
    return this.careers.withdraw(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("track/:token/leave-pool")
  leavePool(@Param("token") token: string) {
    return this.careers.leavePool(token);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post("track/:token/book")
  book(@Param("token") token: string, @Body(new ZodPipe(BookBody)) body: { startsAt: string }) {
    return this.invites.book(token, body.startsAt);
  }

  @Get("track/:token/interviews/:id/ics")
  async ics(@Param("token") token: string, @Param("id") id: string, @Res() res: Response) {
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mulakat.ics"');
    res.send(await this.invites.candidateIcs(token, id));
  }
}
