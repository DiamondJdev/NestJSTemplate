import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DbService } from '../../../db/db.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DbService,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
