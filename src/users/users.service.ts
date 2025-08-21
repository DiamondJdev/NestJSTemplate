import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from 'src/dto/CreateUser.dto';
import { UpdateUserDto } from 'src/dto/update-user.dto';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async findAll(): Promise<User[]> {
		return await this.userRepository.find();
	}

	async create(createUserDto: CreateUserDto): Promise<User | undefined> {
		const exists = await this.userRepository.findOne({
			where: { userId: createUserDto.userId },
		});
		if (exists) {
			return undefined;
		}
		const user = this.userRepository.create(createUserDto);
		return await this.userRepository.save(user);
	}

	async findOne(id: string): Promise<User | null> {
		return await this.userRepository.findOne({ where: { userId: id } });
	}

	async remove(id: string): Promise<User | undefined> {
		const user = await this.userRepository.findOne({ where: { userId: id } });
		if (!user) {
			return undefined;
		}
		await this.userRepository.remove(user);
		return user;
	}

	async update(
		id: string,
		updateUserDto: UpdateUserDto,
	): Promise<User | undefined> {
		const user = await this.userRepository.findOne({ where: { userId: id } });
		if (!user) {
			return undefined;
		}
		Object.assign(user, updateUserDto);
		return await this.userRepository.save(user);
	}
}
