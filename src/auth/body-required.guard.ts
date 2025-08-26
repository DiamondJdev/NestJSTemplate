import {
	Injectable,
	CanActivate,
	ExecutionContext,
	BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/dto/CreateUser.dto';
import { loginUserDto } from 'src/dto/loginUser.dto';

@Injectable()
export class BodyRequiredGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest();
		const body = req?.body;
		if (
			!body ||
			typeof body !== 'object' ||
			Array.isArray(body) ||
			Object.keys(body).length === 0
		) {
			throw new BadRequestException('Request body is required');
		}
		if (req.route.path.includes('login')) {
			const loginDto: loginUserDto = body;
			if (!loginDto.email || !loginDto.password) {
				throw new BadRequestException(
					'Email and password are required',
				);
			}
		} else if (req.route.path.includes('register')) {
			const createUserDto: CreateUserDto = body;
			if (!createUserDto.email || !createUserDto.password) {
				throw new BadRequestException(
					'Email and password are required',
				);
			}
		}
		return true;
	}
}
