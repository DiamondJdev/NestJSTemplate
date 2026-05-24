import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "../../jwt/jwt.service";
import { DbService } from "../../db/db.service";

interface RequestWithUser {
  headers: { authorization?: string };
  cookies?: Record<string, string>;
  user?: { id: string; username: string; roles: string[] };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dbService: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;

    // Extract token from Authorization header or HttpOnly cookie
    let token: string | undefined;
    if (authorization && typeof authorization === "string") {
      const [bearer, headerToken] = authorization.split(" ");
      if (bearer !== "Bearer" || !headerToken)
        throw new UnauthorizedException("Invalid authorization format");
      token = headerToken;
    } else if (request.cookies?.["accessToken"]) {
      token = request.cookies["accessToken"];
    } else {
      throw new UnauthorizedException(
        "Authorization header or accessToken cookie is missing",
      );
    }

    try {
      const payload = await this.jwtService.verifyAndDecode(token);
      if (!payload || !payload.sub)
        throw new UnauthorizedException("Invalid token");

      const user = await this.dbService.findOne(payload.sub);
      if (!user) throw new UnauthorizedException("User not found");

      request.user = {
        id: user.id!,
        username: user.username,
        roles: user.roles,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Token validation failed");
    }
  }
}
