import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "../core/entities/user.entity";
import { UpdateUserPassword } from "../core/dto/updatePassword.dto";
import { UserCacheDto } from "../core/dto/userCache.dto";
import { isValidRoles } from "../core/utils/roleChecker";
import { CacheService } from "../cache/cache.service";
import { CacheKeys } from "../cache/constants/cache-keys";
import { CacheTTL } from "../cache/constants/cache-ttl";
import { UserRole } from "../core/utils/userRole.enum";

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Verifies database connectivity using a trivial query.
   *
   * @returns True if the database responds, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.userRepository.query("SELECT 1");

      const relationResult: unknown[] = await this.userRepository.query(
        "SELECT to_regclass('public.users') AS users_table",
      );

      if (!Array.isArray(relationResult) || relationResult.length === 0)
        return false;

      const firstRow: unknown = relationResult[0];
      if (typeof firstRow !== "object" || firstRow === null) return false;

      const usersTable = (firstRow as Record<string, unknown>).users_table;
      return typeof usersTable === "string" && usersTable.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Returns all users (sanitized, cache-aside).
   */
  async findAll(limit: number, page: number): Promise<User[]> {
    const users = await this.userRepository.find({
      take: limit,
      skip: page * limit,
    });
    if (!users) throw new NotFoundException({ message: "No users found" });
    // Removes sensitive fields by creating cache DTO (which excludes sensitive fields) and then reconstructing a User object from it.
    return users.map((user) =>
      this.reconstructUserFromCache(this.createUserCacheDto(user)),
    );
  }

  /**
   * Creates a new user record.
   *
   * @throws ConflictException if username already exists
   * @throws InternalServerErrorException for unexpected failures
   */
  async create(user: User): Promise<User | undefined> {
    try {
      const created = await this.userRepository.save(user);
      return created;
    } catch (error) {
      const meta = this.getCreateUserErrorMetadata(error);
      this.logger.error("Create user failed", JSON.stringify(meta));

      if (this.isUniqueUsernameViolation(error))
        throw new ConflictException("User already exists");

      if (this.isInvalidUserPayload(error))
        throw new BadRequestException("Invalid user payload");

      if (this.isMissingUsersRelation(error))
        throw new InternalServerErrorException(
          "Database schema not initialized",
        );

      throw new InternalServerErrorException("Failed to create user");
    }
  }

  /**
   * Finds a user by id or username.
   * NOTE: Excludes sensitive fields (password, refreshTokenHash).
   *
   * @throws BadRequestException if no parameters are provided
   */
  async findOne(uuid?: string, username?: string): Promise<User | null> {
    if (!uuid && !username)
      throw new BadRequestException("No Parameters provided");

    if (uuid) {
      const cached = await this.cacheService.get<UserCacheDto>(
        CacheKeys.userSafe(uuid),
      );
      if (cached) return this.reconstructUserFromCache(cached);
    }

    const user = uuid
      ? await this.userRepository.findOneBy({ id: uuid })
      : await this.userRepository.findOneBy({ username });

    if (!user) return null;

    if (uuid) {
      const safeCache = this.createUserCacheDto(user);
      await this.cacheService.set(
        CacheKeys.userSafe(uuid),
        safeCache,
        CacheTTL.USER,
      );
    }

    return this.reconstructUserFromCache(this.createUserCacheDto(user));
  }

  /**
   * Finds a user by username and returns the full entity including sensitive fields.
   * NOTE: Bypasses cache. Only use for authentication flows that need the password hash.
   */
  async findOneSensitive(username: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ username });
  }

  /**
   * Finds a user by id and returns the full entity including sensitive fields.
   * NOTE: Bypasses cache.
   */
  async findOneSensitiveId(uuid: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ id: uuid });
  }

  /**
   * Returns the stored refresh token hash for a user.
   * Reads from the dedicated refreshToken:{userId} cache key first,
   * falls back to a direct DB query on a cache miss.
   */
  async getRefreshTokenHash(userId: string): Promise<string | null> {
    const cached = await this.cacheService.get<string>(
      CacheKeys.refreshToken(userId),
    );
    if (cached !== null) return cached;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });
    return user?.refreshTokenHash ?? null;
  }

  /**
   * Removes a user by id.
   *
   * @throws NotFoundException if user is not found
   */
  async remove(uuid: string): Promise<void> {
    const result = await this.userRepository.delete({ id: uuid });
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to delete");
    await this.cacheService.del(
      CacheKeys.userSafe(uuid),
      CacheKeys.userRole(uuid),
      CacheKeys.refreshToken(uuid),
    );
  }

  /**
   * Updates a user's password.
   *
   * @throws NotFoundException if user is not found
   */
  async updatePassword(
    uuid: string,
    updateUserDto: UpdateUserPassword,
  ): Promise<void> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      updateUserDto.password,
      saltRounds,
    );
    const result = await this.userRepository.update(
      { id: uuid },
      { password: hashedPassword },
    );
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to update");
    await this.cacheService.del(CacheKeys.userSafe(uuid));
    await this.clearRefreshToken(uuid); // Logout and clear refresh token
  }

  /**
   * Updates a user's roles.
   *
   * @throws NotFoundException if roles are invalid or user not found
   */
  async updateRole(uuid: string, roles: UserRole[]): Promise<void> {
    if (!isValidRoles(roles)) throw new BadRequestException("Invalid roles");
    const result = await this.userRepository.update({ id: uuid }, { roles });
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to update roles");
    await this.cacheService.del(
      CacheKeys.userSafe(uuid),
      CacheKeys.userRole(uuid),
    );
  }

  /**
   * Saves a refresh token hash and expiry for the user.
   * Always written atomically with the DB — the cache key is always current.
   *
   * @throws NotFoundException if user not found
   */
  async saveRefreshToken(
    userId: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<void> {
    const result = await this.userRepository.update(
      { id: userId },
      { refreshTokenHash, refreshTokenExpiresAt },
    );
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to save refresh token");

    await this.cacheService.set(
      CacheKeys.refreshToken(userId),
      refreshTokenHash,
      CacheTTL.refreshToken,
    );
    await this.cacheService.del(CacheKeys.userSafe(userId));
  }

  /**
   * Clears a user's refresh token and expiration (logout/revoke).
   *
   * @throws NotFoundException if user not found
   */
  async clearRefreshToken(userId: string): Promise<void> {
    const result = await this.userRepository.update(
      { id: userId },
      { refreshTokenHash: null, refreshTokenExpiresAt: null },
    );
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to clear refresh token");
    await this.cacheService.del(
      CacheKeys.refreshToken(userId),
      CacheKeys.userSafe(userId),
    );
  }

  private createUserCacheDto(user: User): UserCacheDto {
    return new UserCacheDto({
      id: user.id!,
      username: user.username,
      roles: user.roles,
      refreshTokenExpiresAt: user.refreshTokenExpiresAt ?? undefined,
      createdAt: user.createdAt,
    });
  }

  private reconstructUserFromCache(cached: UserCacheDto): User {
    const user = new User();
    user.id = cached.id;
    user.username = cached.username;
    user.roles = cached.roles;
    user.refreshTokenExpiresAt = cached.refreshTokenExpiresAt;
    user.createdAt = cached.createdAt;
    // password and refreshTokenHash intentionally omitted
    return user;
  }

  private isUniqueUsernameViolation(error: unknown): boolean {
    const meta = this.getCreateUserErrorMetadata(error);
    if (meta.code === "23505") return true;
    if (
      meta.constraint?.includes("username") ||
      meta.detail?.includes("username")
    )
      return true;
    return meta.message.toLowerCase().includes("duplicate key");
  }

  private isInvalidUserPayload(error: unknown): boolean {
    return this.getCreateUserErrorMetadata(error).code === "23502";
  }

  private isMissingUsersRelation(error: unknown): boolean {
    const meta = this.getCreateUserErrorMetadata(error);
    if (meta.code === "42P01") return true;
    return meta.message
      .toLowerCase()
      .includes('relation "users" does not exist');
  }

  private getCreateUserErrorMetadata(error: unknown): {
    errorName: string;
    message: string;
    code: string | null;
    detail: string | null;
    table: string | null;
    constraint: string | null;
  } {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        detail?: string;
        table?: string;
        constraint?: string;
      };
      return {
        errorName: error.name,
        message: error.message,
        code: driverError?.code ?? null,
        detail: driverError?.detail ?? null,
        table: driverError?.table ?? null,
        constraint: driverError?.constraint ?? null,
      };
    }
    if (error instanceof Error) {
      const e = error as Error & {
        code?: string;
        detail?: string;
        table?: string;
        constraint?: string;
      };
      return {
        errorName: error.name,
        message: error.message,
        code: e.code ?? null,
        detail: e.detail ?? null,
        table: e.table ?? null,
        constraint: e.constraint ?? null,
      };
    }
    if (typeof error === "object" && error !== null) {
      const e = error as {
        code?: string;
        detail?: string;
        table?: string;
        constraint?: string;
        message?: string;
        name?: string;
      };
      return {
        errorName: e.name ?? "UnknownError",
        message: e.message ?? "Unknown error",
        code: e.code ?? null,
        detail: e.detail ?? null,
        table: e.table ?? null,
        constraint: e.constraint ?? null,
      };
    }
    return {
      errorName: "UnknownError",
      message: String(error),
      code: null,
      detail: null,
      table: null,
      constraint: null,
    };
  }
}
