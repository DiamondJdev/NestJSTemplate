import {
	Controller,
	Get,
	Param,
	Body,
	Patch,
	Delete,
	Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from 'src/dto/CreateUser.dto';
import { UpdateUserDto } from 'src/dto/update-user.dto';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

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

	@Post()
	async createUser(@Body() createUserDto: CreateUserDto) {
		if (!createUserDto || !createUserDto.userId) {
			return { message: 'Invalid user data', status: 400, data: createUserDto };
		}
		const user = await this.usersService.create(createUserDto);
		if (!user) {
			return { message: 'User already exists', status: 409 };
		}
		return { message: 'User created successfully', status: 201, data: user };
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		const user = await this.usersService.findOne(id);
		if (!user) {
			return { message: 'User not found', status: 404, data: undefined };
		}
		return {
			message: 'User retrieved successfully',
			status: 200,
			data: user,
		};
	}

	@Delete(':id')
	async deleteUser(@Param('id') id: string) {
		const user = await this.usersService.remove(id);
		if (!user) {
			return { message: 'User not found', status: 404, data: undefined };
		}
		return {
			message: 'User deleted successfully',
			status: 200,
			data: user,
		};
	}

	@Patch(':id')
	async updateUser(
		@Param('id') id: string,
		@Body() updateUserDto: UpdateUserDto,
	) {
		const updatedUser = await this.usersService.update(id, updateUserDto);
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
