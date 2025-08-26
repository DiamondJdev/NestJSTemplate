import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';

import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { UpdateUserDto } from 'src/dto/update-user.dto';

@Injectable()
export class DbService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		// private readonly authService: AuthService, // Cannot use AuthService
	) {}
	// TODO: Remove findAll() method, replace require parameters
	async findAll(): Promise<User[]> {
		return await this.userRepository.find();
	}

	async create(user: User): Promise<User | undefined> {
		const exists = await this.userRepository.findOne({
			where: { email: user.email }, // check using email instead of uuid
		});
		if (exists) {
			return undefined;
		}
		return await this.userRepository.save(user);
	}

	async findOne(uuid?: string, email?: string): Promise<User | null> {
		if (uuid) {
			return await this.userRepository.findOne({ where: { id: uuid } });
		}
		if (email) {
			return await this.userRepository.findOne({ where: { email } });
		}
		return null;
	}

	async remove(uuid: string): Promise<User | undefined> {
		const user = await this.userRepository.findOne({
			where: { id: uuid },
		});
		if (!user) {
			return undefined;
		}
		await this.userRepository.remove(user);
		return user;
	}

	async update(
		uuid: string,
		updateUserDto: UpdateUserDto,
	): Promise<User | undefined> {
		const user = await this.userRepository.findOne({
			where: { id: uuid },
		});
		if (!user) {
			return undefined;
		}
		Object.assign(user, updateUserDto);
		return await this.userRepository.save(user);
	}
}
