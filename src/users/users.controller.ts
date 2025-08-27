import { Controller, Get, Param, Body, Patch, Delete } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtService } from '../jwt/jwt.service';

@Controller('users')
export class UsersController {
	constructor(
		private readonly usersService: DbService,
		private readonly authService: AuthService,
		private readonly jwtService: JwtService,
	) {}

	@Get()
	async findAll() {
		const users = await this.usersService.findAll();
		if (!users.length) {
			return { message: 'No users found', status: 404 };
		}
		return {
			message: 'Users retrieved successfully',
			status: 200,
			data: users,
		};
	}

	@Get(':uuid')
	async findOne(@Param('uuid') uuid: string) {
		const user = await this.usersService.findOne(uuid, undefined);
		if (!user) {
			return { message: 'User not found', status: 404, data: undefined };
		}
		return {
			message: 'User retrieved successfully',
			status: 200,
			data: user,
		};
	}

	@Delete(':uuid')
	async deleteUser(@Param('uuid') uuid: string) {
		const user = await this.usersService.remove(uuid);
		if (!user) {
			return { message: 'User not found', status: 404, data: undefined };
		}
		return {
			message: 'User deleted successfully',
			status: 200,
			data: user,
		};
	}

	@Patch(':uuid')
	async updateUser(
		@Param('uuid') uuid: string,
		@Body() updateUserDto: UpdateUserDto,
	) {
		const updatedUser = await this.usersService.update(uuid, updateUserDto);
		if (!updatedUser) {
			return { message: 'User not found', status: 404 };
		}
		return {
			message: 'User updated successfully',
			status: 200,
			data: updatedUser,
		};
	}
}
