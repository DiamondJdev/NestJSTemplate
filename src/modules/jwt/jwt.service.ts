import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import ms, { type StringValue } from "ms";

export interface JwtPayload {
  sub: string;     // userId
  roles: string[]; // user roles
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<StringValue>("JWT_REFRESH_EXP"),
    });
  }

  async hashToken(token: string): Promise<string> {
    try {
      const salt: string = await bcrypt.genSalt(10);
      return bcrypt.hash(token, salt);
    } catch {
      throw new InternalServerErrorException("Error processing token");
    }
  }

  compareToken(token: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(token, hash);
    } catch {
      throw new InternalServerErrorException("Error processing token");
    }
  }

  /**
   * Returns true if the token is valid, false if invalid or expired.
   * Does not throw — useful in token rotation flows.
   */
  async verifyToken(token: string): Promise<boolean> {
    return this.jwtService
      .verifyAsync<JwtPayload>(token)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Returns the decoded payload if the token is valid.
   * Throws if the token is invalid or expired.
   */
  async verifyAndDecode<T extends object = JwtPayload>(
    token: string,
  ): Promise<T> {
    return this.jwtService.verifyAsync<T>(token);
  }

  /**
   * Rotates both tokens and returns the new pair plus hash and expiry.
   * Callers must persist the hash + expiry via DbService.saveRefreshToken().
   */
  async rotateTokens(userId: string, roles: string[]) {
    const payload: JwtPayload = { sub: userId, roles };
    const refreshExp =
      this.configService.getOrThrow<StringValue>("JWT_REFRESH_EXP");
    const refreshExpMs = ms(refreshExp);

    if (typeof refreshExpMs !== "number") {
      throw new InternalServerErrorException("Invalid JWT_REFRESH_EXP value");
    }

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      refreshTokenHash: await this.hashToken(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() + refreshExpMs),
    };
  }
}
