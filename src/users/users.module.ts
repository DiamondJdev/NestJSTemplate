import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';

@Module({
	imports: [TypeOrmModule.forFeature([User]), DbModule, AuthModule],
	controllers: [UsersController],
	providers: [AuthService],
})
export class UsersModule {}
