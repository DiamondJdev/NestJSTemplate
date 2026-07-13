import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcrypt";
import { UsersService } from "../db/services/users.service";
import { RefreshTokenService } from "../db/services/refresh-token.service";
import { JwtService, type JwtPayload } from "../jwt/jwt.service";
import { CreateUserDto } from "./dto/createUser.dto";
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
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  // Timing-attack-safe credential check used by the passport-local strategy.
  // Returns the safe user on success, or null on failure (the strategy raises
  // 401) — the bcrypt comparison always runs, even for unknown usernames.
  async validateUser(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; roles: UserRole[] } | null> {
    const user: User | null =
      await this.usersService.findOneSensitive(username);
    if (!user) this.logger.debug("Could not find user", "AuthService");

    const comparisonHash = user ? user.password : DUMMY_BCRYPT_HASH;
    const isMatch = await bcrypt.compare(password, comparisonHash);

    if (!user || !isMatch) {
      this.logger.warn(
        `Failed login attempt for username: ${username}`,
        "AuthService",
      );
      return null;
    }

    if (!user.id)
      throw new InternalServerErrorException("Error processing user data");

    return { id: user.id, username: user.username, roles: user.roles };
  }

  // Rotates + persists a token pair. Shared by login and registration.
  private async persistTokens(
    userId: string,
    roles: UserRole[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const {
      accessToken,
      refreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    } = await this.jwtService.rotateTokens(userId, roles);
    await this.refreshTokenService.saveRefreshToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
    return { accessToken, refreshToken };
  }

  // Issues tokens for an already-authenticated user (req.user from
  // LocalStrategy) and returns the login response body.
  async issueTokensForUser(user: {
    id: string;
    username: string;
    roles: UserRole[];
  }): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; roles: string[] };
  }> {
    const { accessToken, refreshToken } = await this.persistTokens(
      user.id,
      user.roles,
    );

    this.logger.logUserStats("login", user.id, { username: user.username });

    return {
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, roles: user.roles },
    };
  }

  async register(createUserDto: CreateUserDto): Promise<{
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

    user = (await this.usersService.create(user)) as User;
    if (!user || !user.id)
      throw new InternalServerErrorException("Error while creating user");

    const { accessToken, refreshToken } = await this.persistTokens(
      user.id,
      user.roles,
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
    refreshToken: string,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAndDecode(refreshToken);
    } catch (error) {
      this.logger.warn(
        `JWT verification failed during token refresh: ${(error as Error).message}`,
        "AuthService",
      );
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const userId = payload.sub;
    if (!userId) {
      this.logger.warn("Refresh token missing sub claim", "AuthService");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const storedUser = await this.usersService.findOne(userId, undefined);
    const storedHash =
      await this.refreshTokenService.getRefreshTokenHash(userId);

    if (!storedUser || !storedHash || !storedUser.refreshTokenExpiresAt) {
      this.logger.error(
        `Failed refresh attempt for user ID: ${userId}`,
        "AuthService",
      );
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (storedUser.refreshTokenExpiresAt < new Date()) {
      this.logger.warn(
        `Refresh token expired for user: ${userId}`,
        "AuthService",
      );
      throw new UnauthorizedException("Invalid or expired refresh token");
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
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    } = await this.jwtService.rotateTokens(userId, storedUser.roles);
    await this.refreshTokenService.saveRefreshToken(
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
    await this.refreshTokenService.clearRefreshToken(userId);
    this.logger.logUserStats("logout", userId);
  }
}
