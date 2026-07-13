import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";
import { UserRole } from "../../core/utils/userRole.enum";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
  constructor(private readonly authService: AuthService) {
    // Default field names `username`/`password` match LoginUserDto.
    super();
  }

  // AuthService.validateUser keeps the timing-attack-safe credential check. On
  // success the returned user becomes `req.user`; on failure we raise 401.
  async validate(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; roles: UserRole[] }> {
    const user = await this.authService.validateUser(username, password);
    if (!user) throw new UnauthorizedException("Invalid username or password");
    return user;
  }
}
