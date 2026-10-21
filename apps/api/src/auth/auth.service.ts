import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import type { AccessPayload } from "../common/auth";
import { PrismaService } from "../common/prisma.service";
import { slugify, token } from "../common/util";

export const REFRESH_DAYS = 30;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { companyName: string; name: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException({ message: "Bu e-posta ile kayıtlı bir hesap var.", fields: { email: "Bu e-posta kullanılıyor." } });
    }
    const slug = await this.uniqueSlug(input.companyName);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 10),
        memberships: { create: { role: "OWNER", company: { create: { name: input.companyName, slug } } } },
      },
      include: { memberships: true },
    });
    const m = user.memberships[0];
    return this.issue(user.id, m.companyId, m.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { orderBy: { createdAt: "asc" } } },
    });
    // Kullanıcı yoksa da hash karşılaştırması yapılır; yanıt süresinden hesabın varlığı anlaşılmasın.
    const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !ok || !user.memberships.length) throw new UnauthorizedException("E-posta ya da şifre hatalı.");
    const m = user.memberships[0];
    return this.issue(user.id, m.companyId, m.role);
  }

  /**
   * Yenileme belirteci her kullanımda değişir. İptal edilmiş bir belirteç tekrar gelirse
   * çalınmış kabul edilir ve aynı ailedeki tüm belirteçler iptal edilir.
   */
  async refresh(raw: string | undefined) {
    if (!raw) throw new UnauthorizedException("Oturum bulunamadı.");
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash(raw) } });
    if (!row) throw new UnauthorizedException("Oturum bulunamadı.");
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({ where: { family: row.family, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException("Oturum güvenlik nedeniyle sonlandırıldı.");
    }
    if (row.expiresAt < new Date()) throw new UnauthorizedException("Oturumun süresi doldu.");

    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId: row.userId, companyId: row.companyId } },
    });
    if (!membership) throw new UnauthorizedException("Şirket üyeliği bulunamadı.");
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.userId, membership.companyId, membership.role, row.family);
  }

  async logout(raw: string | undefined) {
    if (!raw) return;
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash(raw) } });
    if (row) await this.prisma.refreshToken.updateMany({ where: { family: row.family }, data: { revokedAt: new Date() } });
  }

  async me(userId: string, companyId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { user: { select: { id: true, name: true, email: true } }, company: true },
    });
    if (!m) throw new UnauthorizedException();
    return { user: m.user, role: m.role, company: m.company };
  }

  private async issue(userId: string, companyId: string, role: Role, family: string = randomUUID()) {
    const payload: AccessPayload = { sub: userId, cid: companyId, role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = token(32);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        companyId,
        family,
        tokenHash: hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400_000),
      },
    });
    return { accessToken, refreshToken };
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name) || "sirket";
    for (let i = 0; ; i++) {
      const slug = i ? `${base}-${i + 1}` : base;
      if (!(await this.prisma.company.findUnique({ where: { slug } }))) return slug;
    }
  }
}
