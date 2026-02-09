// You can ignore these, eslint has a seizure when it sees good code
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

export interface JwtPayload {
  sub: string; // userId
  role: string; // user role
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  // ----- ACCESS TOKEN -----
  generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  // ----- REFRESH TOKEN -----
  generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_SECRET"), // Use symmetric secret
      algorithm: "HS256", // Switch to HS256
      expiresIn: this.configService.get<string>("JWT_REFRESH_EXP", "7d"),
    });
  }

  // Hash refresh tokens before storing in DB
  async hashToken(token: string): Promise<string> {
    try {
      const salt: string = (await bcrypt.genSalt(10)) as string;
      return bcrypt.hash(token, salt) as Promise<string>;
    } catch {
      throw new InternalServerErrorException("Error processing token");
    }
  }

  
  // ----- VALIDATION -----
  compareToken(token: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(token, hash) as Promise<boolean>;
    } catch {
      throw new InternalServerErrorException("Error processing token");
    }
  }
  
  /**
   * Verifies JWT tokens as either valid, expired, or invalid without throwing exceptions.
   * Useful for token rotation and refresh flows where we want to handle expired tokens gracefully.
   * NOTE: This will not return JWT payload
   * 
   * @param token The JWT token to verify 
   * @returns True if valid, false if invalid or expired
  */
  async verifyToken(token: string): Promise<boolean> {
    return this.jwtService.verifyAsync<JwtPayload>(token).then(() => true).catch(() => false);
  }
  
  /**
   * Returns a decoded JWT payload if the token is valid
   * Throws UnauthorizedException if the token is invalid or expired
   * 
   * Similar to verifyToken but returns the decoded payload
   * 
   * @param token The JWT token to verify and decode
   * @throws UnauthorizedException if token is invalid or expired
   * @returns JwtPayload 
   */
  async verifyAndDecode<T extends object = JwtPayload>(token: string): Promise<T> {
    return this.jwtService.verifyAsync<T>(token);
  }

  /**
   * Extract Payload without validating signature 
   * 
   * NOTE: SHOULD NOT BE USED IN PRODUCTION CODE
   * 
   * @deprecated
   * @param token The JWT token to decode
   * @returns JwtPayload
   */
  decodeToken(token: string): JwtPayload | null {
    return this.jwtService.decode(token);
  }

  // ----- TOKEN ROTATION -----
  async rotateTokens(userId: string, role: string) {
    const payload: JwtPayload = { sub: userId, role };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Return both but hash refresh before saving
    return {
      accessToken,
      refreshToken,
      refreshTokenHash: await this.hashToken(refreshToken),
    };
  }
}
