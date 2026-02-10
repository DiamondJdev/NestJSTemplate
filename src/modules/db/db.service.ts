import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';

import { User } from '../common/entities/user.entity';
import { UpdateUserDto } from '../common/dto/updateUser.dto';
import { isValidRole } from '../common/utils/roleChecker';

@Injectable()
export class DbService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}
	
	/**
	 * Verifies database connectivity using a trivial query. 
	 * 
	 * @returns True if the database responds, false otherwise
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.userRepository.query('SELECT 1');
			return true;
		} catch {
			return false;
		}
	}
	
	// TODO: Remove findAll() method, replace require parameters
	/**
	 * Returns all users.
	 * 
	 * NOTE: This method is intended to be removed in favor of parameterized queries.
	 * 
	 * @returns User[] An array of all user records in the database
	 */
	async findAll(): Promise<User[]> {
		return await this.userRepository.find();
	}
	
	/**
	 * Creates a new user record.
	 * 
	 * @param user User entity to persist
	 * @throws ConflictException if username already exists
	 * @throws InternalServerErrorException for unexpected failures
	 * @returns Created user
	 */
	async create(user: User): Promise<User | undefined> {
		try {
			return await this.userRepository.save(user);
		} catch (error) {
			if (error instanceof QueryFailedError) throw new ConflictException('User already exists');
			throw new InternalServerErrorException('Failed to create user');
		}
	}
	
	/**
	 * Finds a user by id or username.
	 * 
	 * @param uuid User id
	 * @param username Username
	 * @throws BadRequestException if no parameters are provided
	 * @returns User or null if not found
	 */
	async findOne(uuid?: string, username?: string): Promise<User | null> {
		if (!uuid && !username) throw new BadRequestException('No Parameters provided');
		
		const user = uuid 
			? await this.userRepository.findOneBy({ id: uuid })
			:	await this.userRepository.findOneBy({ username });

		return user ?? null;
	}
	
	/**
	 * Removes a user by id.
	 * 
	 * @param uuid User id
	 * @throws BadRequestException if user is not found
	 * @returns Removed user
	 */
	async remove(uuid: string): Promise<void> {
		const result = await this.userRepository.delete({ id: uuid });
		if (result.affected === 0) throw new BadRequestException('Could not find user to delete');
	}
	
	/**
	 * Updates a user's password.
	 * 
	 * @param uuid User id
	 * @param updateUserDto Update payload
	 * @throws BadRequestException if user is not found
	 * @returns void
	 */
	async update(uuid: string, updateUserDto: UpdateUserDto): Promise<void> {
		const saltRounds = 12;
		const hashedPassword = await bcrypt.hash(updateUserDto.password, saltRounds);

		const result = await this.userRepository.update(
			{ id: uuid },
			{ password: hashedPassword },
		);

		if (result.affected === 0) throw new BadRequestException('Could not find user to update');
	}
	
	/**
	 * Updates a user's role.
	 * 
	 * @param uuid User id
	 * @param role New role
	 * @throws BadRequestException if role is invalid or user not found
	 * @returns void
	 */
	async updateRole(uuid: string, role: string): Promise<void> {
		if (!isValidRole(role)) throw new BadRequestException('Invalid role');

		const result = await this.userRepository.update(
			{ id: uuid },
			{ role },
		);

		if (result.affected === 0) throw new BadRequestException('Could not find user to update role');
	}
	
	/**
	 * Saves a refresh token hash for the user.
	 * 
	 * @param userId User id
	 * @param refreshTokenHash Hashed refresh token
	 * @throws BadRequestException if user not found
	 * @returns void
	 */
	async saveRefreshToken(userId: string, refreshTokenHash: string): Promise<void> {
		const result = await this.userRepository.update(
			{ id: userId },
			{ refreshTokenHash },
		);

		if (result.affected === 0) throw new BadRequestException('Could not find user to save refresh token');
	}
}

