import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { DbService } from '../db/db.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '../jwt/jwt.service';

describe('UsersController', () => {
	let controller: UsersController;

	beforeEach(async () => {
		const mockDbService = {};
		const mockAuthService = {};
		const mockJwtService = {};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [
				{ provide: DbService, useValue: mockDbService },
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: JwtService, useValue: mockJwtService },
			],
		}).compile();

		controller = module.get<UsersController>(UsersController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
