import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcrypt";
import { DbService } from "../db/db.service";
import { JwtService } from "../jwt/jwt.service";
import { createUserDto } from "./dto/createUser.dto";
import { loginUserDto } from "./dto/loginUser.dto";
import { User } from "../core/entities/user.entity";
import { LoggerService } from "../core/logging/services/logger.service";
import { UserRole } from "../core/utils/userRole.enum";

// Pre-generated bcrypt hash (cost 12) used as a dummy comparator to prevent
// timing attacks on unknown usernames — comparison always runs, always fails.
const DUMMY_BCRYPT_HASH =
  "$2b$12$C/.vJyoSgGJE0E7E5Wdl..iRS0LlwM651c01qmPvvrLpzjAU6Yews";

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  async login(loginUserDto: loginUserDto): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; roles: string[] };
  }> {
    const user: User | null = await this.dbService.findOneSensitive(
      loginUserDto.username,
    );
    if (!user) this.logger.debug("Could not find user", "AuthService");

    const comparisonHash = user ? user.password : DUMMY_BCRYPT_HASH;
    const isMatch = await bcrypt.compare(loginUserDto.password, comparisonHash);

    if (!user || !isMatch) {
      this.logger.warn(
        `Failed login attempt for username: ${loginUserDto.username}`,
        "AuthService",
      );
      throw new UnauthorizedException("Invalid username or password");
    }

    if (!user.id)
      throw new InternalServerErrorException("Error processing user data");

    const tokens = await this.jwtService.rotateTokens(user.id, user.roles);
    await this.dbService.saveRefreshToken(
      user.id,
      tokens.refreshTokenHash,
      tokens.refreshTokenExpiresAt,
    );

    this.logger.logUserStats("login", user.id, { username: user.username });

    return {
      message: "User logged in successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, username: user.username, roles: user.roles },
    };
  }

  async register(createUserDto: createUserDto): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; roles: string[] };
  }> {
    const saltRounds = 12;

    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    } catch (error) {
      this.logger.error(
        "Password hashing failed during registration",
        (error as Error).stack,
        "AuthService",
      );
      throw new InternalServerErrorException("Error while creating user");
    }

    let user: User = {
      username: createUserDto.username,
      password: hashedPassword,
      roles: [UserRole.USER],
    };

    user = (await this.dbService.create(user)) as User;
    if (!user || !user.id)
      throw new InternalServerErrorException("Error while creating user");

    const {
      accessToken,
      refreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    } = await this.jwtService.rotateTokens(user.id, user.roles);
    await this.dbService.saveRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    this.logger.log(`New user registered: ${user.username}`, "AuthService");
    this.logger.logUserStats("registration", user.id, {
      username: user.username,
      roles: user.roles,
    });

    return {
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, roles: user.roles },
    };
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    const storedUser = await this.dbService.findOne(userId, undefined);
    const storedHash = await this.dbService.getRefreshTokenHash(userId);

    if (!storedUser || !storedHash || !storedUser.refreshTokenExpiresAt) {
      this.logger.error(
        `Failed refresh attempt for user ID: ${userId}`,
        "AuthService",
      );
      throw new UnauthorizedException("Error validating refresh token");
    }

    if (storedUser.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    const isValidToken = await this.jwtService.compareToken(
      refreshToken,
      storedHash,
    );
    if (!isValidToken) {
      this.logger.warn(
        `Invalid refresh token attempt for user: ${userId}`,
        "AuthService",
      );
      throw new UnauthorizedException("Invalid refresh token");
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    } = await this.jwtService.rotateTokens(userId, storedUser.roles);
    await this.dbService.saveRefreshToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    this.logger.logUserStats("token_refresh", userId);

    return {
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getLoggedIn(accessToken: string): Promise<{ loggedIn: boolean }> {
    return { loggedIn: await this.jwtService.verifyToken(accessToken) };
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await this.dbService.clearRefreshToken(userId);
    this.logger.logUserStats("logout", userId);
  }
}
