import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/dto/CreateUser.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get('login')
	async login(@Body() { email, password }: { email: string; password: string }) {
		return await this.authService.login(email, password);
	}

	@Post('register')
	async register(@Body() createUserDto: CreateUserDto) {
		if (!createUserDto) {
			return { message: 'Invalid user data', status: 400, data: createUserDto };
		}
		const user = await this.authService.register(createUserDto);
		if (!user) {
			return { message: 'User already exists', status: 409 };
		}
		return { message: 'User created successfully', status: 201, data: user };
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
