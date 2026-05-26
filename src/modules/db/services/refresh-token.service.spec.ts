import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { RefreshTokenService } from "./refresh-token.service";
import { User } from "../../core/entities/user.entity";
import { CacheService } from "../../cache/cache.service";

const mockRepository = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

describe("RefreshTokenService", () => {
  let service: RefreshTokenService;
  let repo: ReturnType<typeof mockRepository>;
  let cache: ReturnType<typeof mockCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(User), useFactory: mockRepository },
        { provide: CacheService, useFactory: mockCacheService },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
    repo = module.get(getRepositoryToken(User));
    cache = module.get(CacheService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getRefreshTokenHash", () => {
    it("returns cached hash on cache hit", async () => {
      cache.get.mockResolvedValue("cached-hash");
      const result = await service.getRefreshTokenHash("uuid-1");
      expect(result).toBe("cached-hash");
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it("falls back to DB on cache miss", async () => {
      cache.get.mockResolvedValue(null);
      repo.findOne.mockResolvedValue({ refreshTokenHash: "db-hash" });
      const result = await service.getRefreshTokenHash("uuid-1");
      expect(result).toBe("db-hash");
    });

    it("returns null when user has no token and cache is empty", async () => {
      cache.get.mockResolvedValue(null);
      repo.findOne.mockResolvedValue(null);
      const result = await service.getRefreshTokenHash("uuid-1");
      expect(result).toBeNull();
    });
  });

  describe("saveRefreshToken", () => {
    it("writes to DB, sets cache, and invalidates safe-user key", async () => {
      repo.update.mockResolvedValue({ affected: 1 });
      await service.saveRefreshToken("uuid-1", "hash", new Date());
      expect(cache.set).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalled();
    });

    it("throws NotFoundException when user not found", async () => {
      repo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.saveRefreshToken("uuid-missing", "hash", new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("clearRefreshToken", () => {
    it("nulls DB fields and invalidates both cache keys", async () => {
      repo.update.mockResolvedValue({ affected: 1 });
      await service.clearRefreshToken("uuid-1");
      expect(cache.del).toHaveBeenCalled();
    });

    it("throws NotFoundException when user not found", async () => {
      repo.update.mockResolvedValue({ affected: 0 });
      await expect(service.clearRefreshToken("uuid-missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
