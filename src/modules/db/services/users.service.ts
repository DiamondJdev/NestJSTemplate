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
import { User } from "../../core/entities/user.entity";
import { UpdateUserPassword } from "../../core/dto/updatePassword.dto";
import { UserCacheDto } from "../../core/dto/userCache.dto";
import { isValidRoles } from "../../core/utils/roleChecker";
import { CacheService } from "../../cache/cache.service";
import { CacheKeys } from "../../cache/constants/cache-keys";
import { CacheTTL } from "../../cache/constants/cache-ttl";
import { UserRole } from "../../core/utils/userRole.enum";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(limit: number, page: number): Promise<User[]> {
    const users = await this.userRepository.find({
      take: limit,
      skip: page * limit,
    });
    if (!users) throw new NotFoundException({ message: "No users found" });
    return users.map((user) =>
      this.reconstructUserFromCache(this.createUserCacheDto(user)),
    );
  }

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

  async findOneSensitive(username: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ username });
  }

  async findOneSensitiveId(uuid: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ id: uuid });
  }

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

    // Inline token revocation — inlined to avoid cross-service coupling
    const tokenResult = await this.userRepository.update(
      { id: uuid },
      { refreshTokenHash: null, refreshTokenExpiresAt: null },
    );
    if (tokenResult.affected === 0) {
      this.logger.warn(
        `Password updated but could not clear refresh token for user ${uuid}`,
      );
      return;
    }
    await this.cacheService.del(
      CacheKeys.refreshToken(uuid),
      CacheKeys.userSafe(uuid),
    );
  }

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
