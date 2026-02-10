import { Controller, Get, Param, Body, Patch, Delete, UseGuards, Request, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { UpdateUserDto } from '../common/dto/updateUser.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../common/flow/roles.guard';
import { Roles } from '../common/flow/roles.decorator';
import { UserRole } from '../common/utils/userRole.enum';
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
		if (!users) throw new NotFoundException({ message: 'No users found' });
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
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteUser(@Param('uuid') uuid: string, @Request() req: AuthenticatedRequest) {
		await this.usersService.remove(uuid);
		return {
			message: 'User deleted',
			id: req.user.id,
			username: req.user.username,
		};
	}

	@Patch(':uuid')
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.USER)
	@HttpCode(HttpStatus.OK)
	async updateUser(@Body() updateUserDto: UpdateUserDto, @Request() req: AuthenticatedRequest) {
		try {
			await this.usersService.update(req.user.id, updateUserDto);
		} catch (error) {
			if (error instanceof NotFoundException) throw new NotFoundException({ message: 'User not found' });
			throw error;
		}
		return { message: 'User updated successfully' };
	}
}
