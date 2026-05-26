import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DbHealthService } from "./db-health.service";
import { User } from "../../core/entities/user.entity";

const mockRepository = () => ({
  query: jest.fn(),
});

describe("DbHealthService", () => {
  let service: DbHealthService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbHealthService,
        { provide: getRepositoryToken(User), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(DbHealthService);
    repo = module.get(getRepositoryToken(User));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("healthCheck", () => {
    it("returns true when DB is reachable and users table exists", async () => {
      repo.query
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ users_table: "users" }]);
      expect(await service.healthCheck()).toBe(true);
    });

    it("returns false when users_table is null", async () => {
      repo.query
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ users_table: null }]);
      expect(await service.healthCheck()).toBe(false);
    });

    it("returns false when relation query returns empty array", async () => {
      repo.query.mockResolvedValueOnce([{}]).mockResolvedValueOnce([]);
      expect(await service.healthCheck()).toBe(false);
    });

    it("returns false when DB query throws", async () => {
      repo.query.mockRejectedValue(new Error("connection refused"));
      expect(await service.healthCheck()).toBe(false);
    });
  });
});
