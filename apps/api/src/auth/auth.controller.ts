import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { z } from "zod";
import { type AuthUser, CurrentUser, Public } from "../common/auth";
import { config } from "../common/config";
import { ZodPipe } from "../common/zod.pipe";
import { AuthService, REFRESH_DAYS } from "./auth.service";

const COOKIE = "kadro_rt";

const password = z.string().min(8, "Şifre en az 8 karakter olmalı.").max(72);
const email = z.email("Geçerli bir e-posta girin.").max(160);

const RegisterBody = z.object({
  companyName: z.string().trim().min(2, "Şirket adını girin.").max(80),
  name: z.string().trim().min(2, "Adınızı girin.").max(80),
  email,
  password,
});
const LoginBody = z.object({ email, password: z.string().min(1, "Şifrenizi girin.") });

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body(new ZodPipe(RegisterBody)) body: z.infer<typeof RegisterBody>, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.register(body));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  async login(@Body(new ZodPipe(LoginBody)) body: z.infer<typeof LoginBody>, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.login(body.email, body.password));
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.send(res, await this.auth.refresh(req.cookies?.[COOKIE]));
    } catch (e) {
      res.clearCookie(COOKIE, { path: "/api/auth" });
      throw e;
    }
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { path: "/api/auth" });
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId, user.companyId);
  }

  private send(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie(COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: config().NODE_ENV === "production",
      path: "/api/auth",
      maxAge: REFRESH_DAYS * 86400_000,
    });
    return { accessToken: tokens.accessToken };
  }
}
