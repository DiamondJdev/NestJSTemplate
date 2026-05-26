import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { UsersService } from "./users.service";
import { User } from "../../core/entities/user.entity";
import { CacheService } from "../../cache/cache.service";
import { UserRole } from "../../core/utils/userRole.enum";

const mockRepository = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
});

const mockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: "uuid-1",
    username: "testuser",
    password: "hashed",
    roles: [UserRole.USER],
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  });

describe("UsersService", () => {
  let service: UsersService;
  let repo: ReturnType<typeof mockRepository>;
  let cache: ReturnType<typeof mockCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockRepository },
        { provide: CacheService, useFactory: mockCacheService },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
    cache = module.get(CacheService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("returns field-stripped users", async () => {
      const user = buildUser();
      repo.find.mockResolvedValue([user]);
      const result = await service.findAll(10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].password).toBeUndefined();
      expect(result[0].username).toBe("testuser");
    });
  });

  describe("findOne", () => {
    it("throws BadRequestException when no params given", async () => {
      await expect(service.findOne()).rejects.toThrow(BadRequestException);
    });

    it("returns cached user on cache hit", async () => {
      const cached = {
        id: "uuid-1",
        username: "testuser",
        roles: [UserRole.USER],
        refreshTokenExpiresAt: undefined,
        createdAt: new Date("2025-01-01"),
      };
      cache.get.mockResolvedValue(cached);
      const result = await service.findOne("uuid-1");
      expect(repo.findOneBy).not.toHaveBeenCalled();
      expect(result!.username).toBe("testuser");
    });

    it("fetches from DB and populates cache on cache miss by UUID", async () => {
      const user = buildUser();
      cache.get.mockResolvedValue(null);
      repo.findOneBy.mockResolvedValue(user);
      const result = await service.findOne("uuid-1");
      expect(cache.set).toHaveBeenCalled();
      expect(result!.password).toBeUndefined();
    });

    it("fetches from DB by username without caching", async () => {
      const user = buildUser();
      repo.findOneBy.mockResolvedValue(user);
      await service.findOne(undefined, "testuser");
      expect(cache.set).not.toHaveBeenCalled();
    });

    it("returns null when user not found", async () => {
      cache.get.mockResolvedValue(null);
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.findOne("uuid-missing");
      expect(result).toBeNull();
    });
  });

  describe("findOneSensitive", () => {
    it("returns full user including password", async () => {
      const user = buildUser();
      repo.findOneBy.mockResolvedValue(user);
      const result = await service.findOneSensitive("testuser");
      expect(result!.password).toBe("hashed");
    });
  });

  describe("findOneSensitiveId", () => {
    it("returns full user by uuid", async () => {
      const user = buildUser();
      repo.findOneBy.mockResolvedValue(user);
      const result = await service.findOneSensitiveId("uuid-1");
      expect(result!.id).toBe("uuid-1");
    });
  });

  describe("create", () => {
    it("returns created user", async () => {
      const user = buildUser();
      repo.save.mockResolvedValue(user);
      const result = await service.create(user);
      expect(result!.username).toBe("testuser");
    });

    it("throws ConflictException on unique username violation (code 23505)", async () => {
      const err = Object.assign(new QueryFailedError("", [], new Error()), {
        driverError: { code: "23505" },
      });
      repo.save.mockRejectedValue(err);
      await expect(service.create(buildUser())).rejects.toThrow(ConflictException);
    });

    it("throws BadRequestException on NOT NULL violation (code 23502)", async () => {
      const err = Object.assign(new QueryFailedError("", [], new Error()), {
        driverError: { code: "23502" },
      });
      repo.save.mockRejectedValue(err);
      await expect(service.create(buildUser())).rejects.toThrow(BadRequestException);
    });

    it("throws InternalServerErrorException on missing relation (code 42P01)", async () => {
      const err = Object.assign(new QueryFailedError("", [], new Error()), {
        driverError: { code: "42P01" },
      });
      repo.save.mockRejectedValue(err);
      await expect(service.create(buildUser())).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it("throws InternalServerErrorException on unknown error", async () => {
      repo.save.mockRejectedValue(new Error("unexpected"));
      await expect(service.create(buildUser())).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("remove", () => {
    it("deletes user and clears cache", async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      await service.remove("uuid-1");
      expect(cache.del).toHaveBeenCalled();
    });

    it("throws NotFoundException when user not found", async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove("uuid-missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updatePassword", () => {
    it("updates password, clears safe cache, and inlines token revocation", async () => {
      repo.update.mockResolvedValue({ affected: 1 });
      await service.updatePassword("uuid-1", { password: "NewP@ssw0rd123!" });
      expect(repo.update).toHaveBeenCalledTimes(2);
      expect(cache.del).toHaveBeenCalledTimes(2);
    });

    it("throws NotFoundException when user not found on password update", async () => {
      repo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.updatePassword("uuid-missing", { password: "NewP@ssw0rd123!" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateRole", () => {
    it("updates roles and clears cache", async () => {
      repo.update.mockResolvedValue({ affected: 1 });
      await service.updateRole("uuid-1", [UserRole.ADMIN]);
      expect(cache.del).toHaveBeenCalled();
    });

    it("throws BadRequestException on invalid roles", async () => {
      await expect(
        service.updateRole("uuid-1", ["invalid-role" as UserRole]),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when user not found", async () => {
      repo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.updateRole("uuid-missing", [UserRole.USER]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
