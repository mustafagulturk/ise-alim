import { Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, BadRequestException, Param, Patch, Post } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { type AuthUser, CurrentUser, Roles } from "../common/auth";
import { PrismaService } from "../common/prisma.service";
import { ZodPipe } from "../common/zod.pipe";

const CompanyBody = z.object({
  name: z.string().trim().min(2).max(80),
  about: z.string().trim().max(2000),
  website: z.url("Geçerli bir adres girin.").max(200).nullish().or(z.literal("").transform(() => null)),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Renk #RRGGBB biçiminde olmalı."),
});
const role = z.enum(["OWNER", "RECRUITER", "INTERVIEWER"]);
const MemberBody = z.object({
  name: z.string().trim().min(2, "Ad girin.").max(80),
  email: z.email("Geçerli bir e-posta girin."),
  role,
  password: z.string().min(8, "Geçici şifre en az 8 karakter olmalı.").max(72),
});
const RoleBody = z.object({ role });

@Controller("company")
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(@CurrentUser() u: AuthUser) {
    return this.prisma.company.findUniqueOrThrow({ where: { id: u.companyId } });
  }

  @Roles("OWNER")
  @Patch()
  update(@CurrentUser() u: AuthUser, @Body(new ZodPipe(CompanyBody)) body: z.infer<typeof CompanyBody>) {
    return this.prisma.company.update({ where: { id: u.companyId }, data: body });
  }

  @Get("members")
  async members(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.membership.findMany({
      where: { companyId: u.companyId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return rows.map((m) => ({ ...m.user, id: m.id, userId: m.user.id, role: m.role, createdAt: m.createdAt }));
  }

  @Roles("OWNER")
  @Post("members")
  async addMember(@CurrentUser() u: AuthUser, @Body(new ZodPipe(MemberBody)) body: z.infer<typeof MemberBody>) {
    const email = body.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await this.prisma.membership.findUnique({ where: { userId_companyId: { userId: user.id, companyId: u.companyId } } }))) {
      throw new ConflictException({ message: "Bu kişi zaten ekipte.", fields: { email: "Zaten ekipte." } });
    }
    user ??= await this.prisma.user.create({ data: { email, name: body.name, passwordHash: await bcrypt.hash(body.password, 10) } });
    return this.prisma.membership.create({ data: { userId: user.id, companyId: u.companyId, role: body.role } });
  }

  @Roles("OWNER")
  @Patch("members/:id")
  async setRole(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body(new ZodPipe(RoleBody)) body: z.infer<typeof RoleBody>) {
    const m = await this.member(u, id);
    if (m.role === "OWNER" && body.role !== "OWNER") await this.ensureAnotherOwner(u.companyId, m.id);
    return this.prisma.membership.update({ where: { id }, data: { role: body.role } });
  }

  @Roles("OWNER")
  @HttpCode(204)
  @Delete("members/:id")
  async remove(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const m = await this.member(u, id);
    if (m.role === "OWNER") await this.ensureAnotherOwner(u.companyId, m.id);
    await this.prisma.membership.delete({ where: { id } });
  }

  @Roles("OWNER", "RECRUITER")
  @Get("emails")
  emails(@CurrentUser() u: AuthUser) {
    return this.prisma.emailMessage.findMany({
      where: { companyId: u.companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { application: { select: { id: true, candidate: { select: { name: true } }, job: { select: { title: true } } } } },
    });
  }

  private async member(u: AuthUser, id: string) {
    const m = await this.prisma.membership.findFirst({ where: { id, companyId: u.companyId } });
    if (!m) throw new NotFoundException("Üye bulunamadı.");
    return m;
  }

  private async ensureAnotherOwner(companyId: string, exceptId: string) {
    const owners = await this.prisma.membership.count({ where: { companyId, role: "OWNER", id: { not: exceptId } } });
    if (!owners) throw new BadRequestException("Şirketin en az bir yöneticisi olmalı.");
  }
}
