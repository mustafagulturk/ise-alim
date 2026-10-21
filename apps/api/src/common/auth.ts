import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@prisma/client";
import type { Request } from "express";

export interface AuthUser {
  userId: string;
  companyId: string;
  role: Role;
}

export interface AccessPayload {
  sub: string;
  cid: string;
  role: Role;
}

const PUBLIC = "isPublic";
const ROLES = "roles";

/** Uç nokta oturum gerektirmez (kariyer sayfası, giriş vb.). */
export const Public = () => SetMetadata(PUBLIC, true);

/** Uç noktaya yalnızca listelenen roller erişebilir. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user;
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException("Oturum açmanız gerekiyor.");

    try {
      const p = this.jwt.verify<AccessPayload>(token);
      req.user = { userId: p.sub, companyId: p.cid, role: p.role };
    } catch {
      throw new UnauthorizedException("Oturumunuzun süresi doldu.");
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(req.user.role)) {
      throw new ForbiddenException("Bu işlem için yetkiniz yok.");
    }
    return true;
  }
}
