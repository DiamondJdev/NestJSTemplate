import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { UsersService } from "../../db/services/users.service";
import type { JwtPayload } from "../../jwt/jwt.service";
import { UserRole } from "../../core/utils/userRole.enum";

// Preserves the pre-Passport extraction priority: Authorization: Bearer <token>
// first, then the HttpOnly `accessToken` cookie.
const cookieExtractor = (req: Request): string | null => {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.accessToken ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
      algorithms: ["HS256"],
    });
  }

  // Runs after the JWT signature/expiry is verified. Keeps the DB/cache lookup
  // so deleted users get 401 and role changes take effect immediately. The
  // returned object becomes `req.user`.
  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; username: string; roles: UserRole[] }> {
    if (!payload?.sub) throw new UnauthorizedException("Invalid token");

    const user = await this.usersService.findOne(payload.sub);
    if (!user?.id) throw new UnauthorizedException("User not found");

    return { id: user.id, username: user.username, roles: user.roles };
  }
}
