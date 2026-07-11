import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import ms, { type StringValue } from "ms";

export interface JwtPayload {
  sub: string; // userId
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
      expiresIn: this.configService.getOrThrow<StringValue>("JWT_REFRESH_EXP"),
    });
  }

  /**
   * bcrypt silently truncates input at 72 bytes. Refresh tokens are full
   * JWTs (200+ chars) that share an identical prefix per user (header +
   * partial sub claim), so hashing/comparing them directly made rotation
   * a no-op — any two tokens for the same user collided under bcrypt.
   * Pre-hashing with SHA-256 folds the entire token into a fixed 64-char
   * digest before bcrypt ever sees it, so no token content is discarded.
   */
  private digestToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async hashToken(token: string): Promise<string> {
    try {
      const salt: string = await bcrypt.genSalt(10);
      return await bcrypt.hash(this.digestToken(token), salt);
    } catch {
      throw new InternalServerErrorException("Error processing token");
    }
  }

  async compareToken(token: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(this.digestToken(token), hash);
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
