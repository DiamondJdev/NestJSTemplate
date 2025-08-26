import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/CreateUser.dto';
import { loginUserDto } from '../dto/loginUser.dto';

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
	async login(@Body() loginUserDto: loginUserDto) {
		if (!loginUserDto.email || !loginUserDto.password) {
			return {
				message: 'Email and password are required',
				status: 400,
			};
		}
		return await this.authService.login(loginUserDto.email, loginUserDto.password);
	}

	@Post('register')
	async register(@Body() createUserDto: CreateUserDto) {
		if (!createUserDto) {
			return {
				message: 'Invalid user data',
				status: 400,
				data: createUserDto,
			};
		}
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
