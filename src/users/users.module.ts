import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { User } from '../entities/user.entity';

@Module({
	imports: [UsersModule, TypeOrmModule.forFeature([User])],
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}
