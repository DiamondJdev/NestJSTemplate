import { Controller, Get, Param, Body, Patch, Delete, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { UpdateUserDto } from '../common/dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserRole } from '../roles/roles.service';
import type { AuthenticatedRequest } from '../common/AuthenticatedRequest';

@Controller('users')
@UseGuards(JwtAuthGuard) // All user endpoints require authentication
export class UsersController {
	constructor(private readonly usersService: DbService) {}

	@Get()
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	async findAll() {
		const users = await this.usersService.findAll();
		if (!users) return { message: 'No users found', status: 404 };
		return {
			message: 'Users retrieved successfully',
			data: users.map((user) => ({
				id: user.id,
				username: user.username,
				createdAt: user.createdAt,
				role: user.role,
			})),
		};
	}

	@Get('me')
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.USER)
	@HttpCode(HttpStatus.OK)
	findMe(@Request() req: AuthenticatedRequest) {
		return {
			message: 'User retrieved successfully',
			id: req.user.id,
			username: req.user.username,
			role: req.user.role,
		};
	}

	@Delete(':uuid')
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	@HttpCode(204) 
	async deleteUser(@Param('uuid') uuid: string, @Request() req: AuthenticatedRequest) {
		await this.usersService.remove(uuid);
		return {
			message: 'User deleted successfully',
			id: req.user.id,
			username: req.user.username,
		};
	}

	@Patch(':uuid')
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.USER)
	@HttpCode(HttpStatus.OK)
	async updateUser(@Body() updateUserDto: UpdateUserDto, @Request() req: AuthenticatedRequest) {
		const updatedUser = await this.usersService.update(req.user.id, updateUserDto);
		if (!updatedUser) return { message: 'User not found', status: 404 };
		return { message: 'User updated successfully' };
	}
}
