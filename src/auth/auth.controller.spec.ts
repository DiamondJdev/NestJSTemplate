import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '../jwt/jwt.service';

describe('AuthController', () => {
	let controller: AuthController;

	beforeEach(async () => {
		const mockAuthService = {
			login: jest.fn(),
			register: jest.fn(),
			refresh: jest.fn(),
			getLoggedIn: jest.fn(),
		};
		const mockJwtService = {};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: JwtService, useValue: mockJwtService },
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
