import bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { DbService } from 'src/db/db.service';
import { User } from '../entities/user.entity';

import { loginUserDto } from 'src/dto/loginUser.dto';
import { CreateUserDto } from 'src/dto/CreateUser.dto';

describe('AuthService', () => {
	let authService: AuthService;
	let dbService: jest.Mocked<DbService>;

	beforeEach(() => {
		dbService = {
			findOne: jest.fn(),
			create: jest.fn(),
		} as any;
		authService = new AuthService(dbService);
	});

	describe('login', () => {
		it('should return token/message for valid credentials', async () => {
			const user: User = {
				email: 'test@test.com',
				password: 'hashed',
				createdAt: new Date(),
				id: '1',
				firstName: 'Test',
				lastName: 'User',
			} as User;
			dbService.findOne.mockResolvedValue(user);
			jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
			const dto: loginUserDto = {
				email: 'test@test.com',
				password: 'pass',
			};
			const result = await authService.login(dto);
			expect(result).toEqual({
				message: 'User logged in successfully',
				token: 'dummy-jwt-token',
			});
		});

		it('should throw error for missing user', async () => {
			dbService.findOne.mockResolvedValue(null);
			const dto: loginUserDto = {
				email: 'notfound@test.com',
				password: 'pass',
			};
			await expect(authService.login(dto)).rejects.toThrow(
				'User not found',
			);
		});

		it('should throw error for invalid password', async () => {
			const user: User = {
				email: 'test@test.com',
				password: 'hashed',
				createdAt: new Date(),
				id: '1',
				firstName: 'Test',
				lastName: 'User',
			} as User;
			dbService.findOne.mockResolvedValue(user);
			jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
			const dto: loginUserDto = {
				email: 'test@test.com',
				password: 'wrong',
			};
			await expect(authService.login(dto)).rejects.toThrow(
				'Invalid password',
			);
		});
	});

	describe('register', () => {
		it('should return user for valid data', async () => {
			jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');
			dbService.create.mockResolvedValue({
				email: 'new@test.com',
				password: 'hashed',
				createdAt: new Date(),
				id: '2',
				firstName: 'New',
				lastName: 'User',
			});
			const dto: CreateUserDto = {
				email: 'new@test.com',
				password: 'pass',
				firstName: 'New',
				lastName: 'User',
				username: 'newuser',
			};
			const result = await authService.register(dto);
			expect(result).toHaveProperty('email', 'new@test.com');
			expect(result).toHaveProperty('password', 'hashed');
		});

		it('should throw error for hashing failure', async () => {
			jest.spyOn(bcrypt, 'hash').mockRejectedValue(new Error('fail'));
			const dto: CreateUserDto = {
				email: 'fail@test.com',
				password: 'pass',
			};
			await expect(authService.register(dto)).rejects.toThrow(
				'Error hashing password',
			);
		});
	});

	describe('refresh', () => {
		it('should return success message', () => {
			expect(authService.refresh()).toEqual({
				message: 'Token refreshed successfully',
			});
		});
	});

	describe('getLoggedIn', () => {
		it('should return loggedIn true', () => {
			expect(authService.getLoggedIn()).toEqual({ loggedIn: true });
		});
	});

	// ...existing code...
});
