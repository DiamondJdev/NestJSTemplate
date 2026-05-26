import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../core/entities/user.entity";
import { CacheService } from "../../cache/cache.service";
import { CacheKeys } from "../../cache/constants/cache-keys";
import { CacheTTL } from "../../cache/constants/cache-ttl";

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

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
    // Invalidate the safe-user cache — refreshTokenExpiresAt changed on the user row
    await this.cacheService.del(CacheKeys.userSafe(userId));
  }

  async clearRefreshToken(userId: string): Promise<void> {
    const result = await this.userRepository.update(
      { id: userId },
      { refreshTokenHash: null, refreshTokenExpiresAt: null },
    );
    if (result.affected === 0)
      throw new NotFoundException("Could not find user to clear refresh token");
    await this.cacheService.del(
      CacheKeys.refreshToken(userId),
      // Invalidate the safe-user cache — refreshTokenExpiresAt cleared on the user row
      CacheKeys.userSafe(userId),
    );
  }
}
