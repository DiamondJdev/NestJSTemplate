/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';

import { DbService } from '../db/db.service';
import { JwtService } from '../jwt/jwt.service';
import { createUserDto } from './dto/createUser.dto';
import { loginUserDto } from './dto/loginUser.dto';
import { User } from '../common/entities/user.entity';
import type { AuthenticatedRequest } from '../common/AuthenticatedRequest';
import { LoggerService } from '../common/logging/services/logger.service';

@Injectable()
export class AuthService {
	constructor(
		private readonly dbService: DbService,
		private readonly jwtService: JwtService,
		private readonly logger: LoggerService,
	) {}

	/**
	 * Authenticates a user by validating their username and password credentials.
	 * If parameters are invalid, placeholder hashes and IDs are used to prevent timing 
	 * attacks, but are still rejected, even if placeholder hash is correct.
	 *
	 * @param loginUserDto - Login credentials containing username and password
	 * @returns A promise that resolves to an object containing a success message and authentication token
	 * @throws {Error} When username or password are missing
	 * @throws {Error} When user with the provided username is not found
	 * @throws {Error} When the provided password doesn't match the stored hash
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.login({ username: 'cam', password: '123456' });
	 * console.log(result.message); // "User logged in successfully"
	 * console.log(result.accessToken);   // JWT access token
	 * ```
	 */
	async login(loginUserDto: loginUserDto): Promise<{ message: string; userID: string; accessToken: string; refreshToken: string; }> {
		const user: User | null = await this.dbService.findOne(undefined, loginUserDto.username);

		const comparisonHash = user ? user.password : '$2b$12$invalidhashinvalidhas$2b$12$invalidhashinvalidhas';
		const isMatch = await bcrypt.compare(loginUserDto.password, comparisonHash) as boolean;

		if (!user || !isMatch) {
			this.logger.warn(`Failed login attempt for username: ${loginUserDto.username}`, 'AuthService');
			throw new UnauthorizedException('Invalid Username or Password');
		}

		// Needed to satisfy type system, but id is never null
		if (!user.id) throw new InternalServerErrorException('Error processing user data');

		const tokens = await this.jwtService.rotateTokens(user.id, user.role);
		await this.dbService.saveRefreshToken(user.id, tokens.refreshTokenHash);

		this.logger.logUserStats('login', user.id, { username: user.username });

		return {
			message: 'User logged in successfully',
			userID: user.id,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		};
	}

	/**
	 * Registers a new user with the provided username and password.
	 *
	 * @param createUserDto - The user's registration data containing username and password
	 * @returns A promise that resolves to an object containing a success message and the user's ID
	 * @throws {Error} When username or password is missing
	 * @throws {Error} When password hashing fails
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.register({ username: 'newuser', password: 'securePassword123' });
	 * console.log(result); // { message: 'User registered successfully', userID: 'uuid' }
	 * ```
	 */
	async register(createUserDto: createUserDto): Promise<{ message: string; userID: string; accessToken: string; refreshToken: string; }> {
		const saltRounds = 12;

		// Hash the password
		let hashedPassword: string;
		try {
			hashedPassword = await bcrypt.hash(
				createUserDto.password,
				saltRounds,
			) as string;
		} catch (error) {
			this.logger.error('Password hashing failed during registration', (error as Error).stack, 'AuthService');
			throw new InternalServerErrorException('Error while creating user');
		}

		let user: User = {
			username: createUserDto.username,
			password: hashedPassword,
			role: 'user',
		};

		user = (await this.dbService.create(user)) as User;
		if (!user || !user.id) throw new InternalServerErrorException('Error while creating user');
		const { accessToken, refreshToken, refreshTokenHash } = await this.jwtService.rotateTokens(user.id, user.role);
		await this.dbService.saveRefreshToken(user.id, refreshTokenHash);

		this.logger.log(`New user registered: ${user.username}`, 'AuthService');
		this.logger.logUserStats('registration', user.id, { username: user.username, role: user.role });

		return {
			message: 'User registered successfully',
			userID: user.id,
			accessToken,
			refreshToken,
		};
	}

	/**
	 * Refreshes the authentication token for the logged-in user.
	 *
	 * @param refreshToken - The refresh token to validate and use for generating new tokens
	 * @returns A promise that resolves to an object containing a success message and the user's new tokens
	 * @throws {UnauthorizedException} When refresh token is invalid or expired
	 * @throws {UnauthorizedException} When user is not found or has no stored refresh token
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.refresh('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
	 * console.log(result.accessToken); // New access token
	 * console.log(result.newRefreshToken); // New refresh token
	 * ```
	 */
	async refresh(req: AuthenticatedRequest, refreshToken: string): Promise<{ message: string; accessToken: string; refreshToken: string; }> {
		const user: User | null = await this.dbService.findOne(req.user.id);
		if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Error validating refresh token');

		
		const isValidToken = await this.jwtService.compareToken(refreshToken, user.refreshTokenHash);
		if (!isValidToken) {
			this.logger.warn(`Invalid refresh token attempt for user: ${req.user.id}`, 'AuthService');
			throw new UnauthorizedException('Invalid refresh token');
		}

		const { accessToken, refreshToken: newRefreshToken, refreshTokenHash } = await this.jwtService.rotateTokens(req.user.id, user.role);
		await this.dbService.saveRefreshToken(req.user.id, refreshTokenHash);

		this.logger.logUserStats('token_refresh', req.user.id);

		return {
			message: 'Token refreshed successfully',
			accessToken,
			refreshToken: newRefreshToken,
		};
	}

	async getLoggedIn(accessToken: string): Promise<{ loggedIn: boolean; userId?: string }> {
		return { loggedIn: await this.jwtService.verifyToken(accessToken) };
	}
}
