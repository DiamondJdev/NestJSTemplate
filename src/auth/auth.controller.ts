import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/CreateUser.dto';
import { loginUserDto } from '../dto/loginUser.dto';
import { BodyRequiredGuard } from './body-required.guard';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Handles user login authentication
	 *
	 * @param loginUserDto - The login credentials containing optional username and email parameters and a required password
	 * @returns Promise resolving to authentication result with user data and token on success,
	 *          or error response with status 400 if email or password are missing
	 *
	 * @example
	 * ```
	 * POST /auth/login
	 * {
	 *   "email": "user@example.com",
	 *   "password": "userPassword"
	 * }
	 * ```
	 */
	@Post('login')
	@UseGuards(BodyRequiredGuard) // Checks input before hitting route
	async login(@Body() loginUserDto: loginUserDto) {
		return await this.authService.login(loginUserDto);
	}

	@Post('register')
	@UseGuards(BodyRequiredGuard) // Checks input before hitting route
	async register(@Body() createUserDto: CreateUserDto) {
		const user = await this.authService.register(createUserDto);
		if (!user) {
			return { message: 'User already exists', status: 409 };
		}
		return {
			message: 'User created successfully',
			status: 201,
			data: user,
		};
	}

	@Patch('refresh')
	refresh() {
		return this.authService.refresh();
	}

	@Get('loggedIn')
	loggedIn() {
		return this.authService.getLoggedIn();
	}
}
