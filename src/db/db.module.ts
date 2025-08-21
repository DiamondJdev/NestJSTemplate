import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Module({
	imports: [TypeOrmModule.forFeature([User])],
	exports: [TypeOrmModule],
})
export class DbModule {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async createUser(user: Partial<User>) {
		return await this.userRepository.save(user);
	}

	async findAllUsers() {
		return await this.userRepository.find();
	}

	async findUserById(id: string) {
		return await this.userRepository.findOne({ where: { userId: id } });
	}

	async updateUser(id: string, updatedUser: Partial<User>) {
		const user = await this.userRepository.findOne({ where: { userId: id } });
		if (!user) return null;
		Object.assign(user, updatedUser);
		return await this.userRepository.save(user);
	}

	async deleteUser(id: string) {
		const user = await this.userRepository.findOne({ where: { userId: id } });
		if (!user) return null;
		await this.userRepository.remove(user);
		return user;
	}
}
