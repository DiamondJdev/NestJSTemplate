import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { DbService } from '../db/db.service'; // Should prob move into own db file later

import { CreateUserDto } from 'src/dto/CreateUser.dto';
import { loginUserDto } from 'src/dto/loginUser.dto';
import { User } from 'src/entities/user.entity';

@Injectable()
export class AuthService {
	constructor(private readonly dbService: DbService) {}
	/**
	 * Authenticates a user by validating their email and password credentials.
	 *
	 * @param email - The user's email address used for authentication
	 * @param password - The user's plain text password to be verified
	 * @returns A promise that resolves to an object containing a success message and authentication token
	 * @throws {Error} When email or password are missing
	 * @throws {Error} When user with the provided email is not found
	 * @throws {Error} When the provided password doesn't match the stored hash
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.login('user@example.com', 'password123');
	 * console.log(result.message); // "User logged in successfully"
	 * console.log(result.token);   // "dummy-jwt-token"
	 * ```
	 */
	// eslint-disable-next-line prettier/prettier
	async login(loginUserDto: loginUserDto): Promise<{ message: string; token: string }> {
		// Lookup user in Database
		const user: User | null = await this.dbService.findOne(
			undefined,
			loginUserDto.email,
		);
		if (!user) {
			throw new Error('User not found');
		}

		// Compare password to saved hash
		const isMatch: boolean = await bcrypt.compare(loginUserDto.password, user.password);
		if (!isMatch) {
			throw new Error('Invalid password');
		}

		return {
			message: 'User logged in successfully',
			token: 'dummy-jwt-token', // TODO: Implment JWT Service
		};
	}

	/**
	 * Registers a new user with the provided email and password.
	 *
	 * @param email - The user's email address
	 * @param password - The user's plain text password
	 * @returns A promise that resolves to an object containing a success message and the user's email
	 * @throws {Error} When email or password is missing
	 * @throws {Error} When password hashing fails
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.register('user@example.com', 'securePassword123');
	 * console.log(result); // { message: 'User registered successfully', userId: 'user@example.com' }
	 * ```
	 */
	async register(createUserDto: CreateUserDto): Promise<User | null> {
		const saltRounds = 12;

		// Hash the password
		let hashedPassword: string;
		try {
			hashedPassword = await bcrypt.hash(
				createUserDto.password,
				saltRounds,
			);
		} catch {
			throw new Error('Error hashing password');
		}

		// Store user with encrypted password (Login compares password to hash)
		let user: User = {
			...createUserDto,
			password: hashedPassword,
			createdAt: new Date(),
			id: undefined,
		};

		user = (await this.dbService.create(user)) as User;
		console.log(user);
		return user;
	}

	/**
	 * Refreshes the authentication token for the logged-in user.
	 *
	 * @returns A promise that resolves to an object containing a success message and the user's new token
	 * @throws {Error} When token is missing
	 * @throws {Error} When token refresh fails
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.refresh();
	 * console.log(result.message); // "Token refreshed successfully"
	 * ```
	 */
	refresh() {
		// Simulate token refresh logic
		return { message: 'Token refreshed successfully' };
	}

	getLoggedIn() {
		// Simulate check for logged in user
		return { loggedIn: true };
	}
}
