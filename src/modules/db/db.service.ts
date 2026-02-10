import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from '../common/entities/user.entity';
import { UpdateUserDto } from '../common/dto/update-user.dto';
import { isValidRole } from '../common/utils/roleChecker';

@Injectable()
export class DbService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async healthCheck(): Promise<boolean> {
		try {
			await this.userRepository.query('SELECT 1');
			return true;
		} catch {
			return false;
		}
	}

	// TODO: Remove findAll() method, replace require parameters
	async findAll(): Promise<User[]> {
		return await this.userRepository.find();
	}

	async create(user: User): Promise<User | undefined> {
		// Check for existing user by username
		const existingUser = await this.findOne(undefined, user.username);
		if (existingUser) throw new ConflictException('User already exists');
		return await this.userRepository.save(user);
	}

	async findOne(uuid?: string, username?: string): Promise<User | null> {
		if(!uuid && !username) throw new BadRequestException('No Parameters provided');
		let user: User | null = null;
		if (uuid) user = await this.userRepository.findOne({ where: { id: uuid } });
		else if (username) user = await this.userRepository.findOne({ where: { username } });
		if (!user) throw new BadRequestException('No user found with provided parameters');
		return user;
	}

	async remove(uuid: string): Promise<User | undefined> {
		const user = await this.userRepository.findOne({where: { id: uuid }});
		if (!user) throw new BadRequestException('User not found');
		return await this.userRepository.remove(user);
	}

	async update(uuid: string, updateUserDto: UpdateUserDto): Promise<User | undefined> {
		const user = await this.userRepository.findOne({where: { id: uuid }});
		if (!user) throw new BadRequestException('User not found');
		
		if (updateUserDto.password) {
			const saltRounds = 12;
			try {
				const hashedPassword = await bcrypt.hash(updateUserDto.password, saltRounds);
				user.password = hashedPassword;
			} catch {
				throw new InternalServerErrorException('Error while updating user');
			}
		} else throw new BadRequestException('No update parameters provided');
		
		return await this.userRepository.save(user);
	}

	async updateRole(uuid: string, role: string): Promise<User | undefined> {
		if (!isValidRole(role)) throw new BadRequestException('Invalid role');
		const user = await this.userRepository.findOne({where: { id: uuid }});
		if (!user) throw new BadRequestException('User could not be found');
		user.role = role;
		return await this.userRepository.save(user);
	}

	async saveRefreshToken(userId: string, refreshTokenHash: string): Promise<void> {
		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (!user) throw new BadRequestException('User could not be found');
		user.refreshTokenHash = refreshTokenHash;
		await this.userRepository.save(user);
	}
}

