import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { DbHealthService } from "../../../db/services/db-health.service";
import { CacheService } from "../../../cache/cache.service";
import { LoggerService } from "../../logging/services/logger.service";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DbHealthService,
          useValue: { healthCheck: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: CacheService,
          useValue: { ping: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
