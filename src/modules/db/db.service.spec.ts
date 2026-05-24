import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DbService } from "./db.service";
import { User } from "../core/entities/user.entity";
import { CacheService } from "../cache/cache.service";

describe("DbService", () => {
  let service: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            ping: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<DbService>(DbService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
