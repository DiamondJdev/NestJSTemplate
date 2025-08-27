import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { DbModule } from '../db/db.module';
import { JwtModule } from '../jwt/jwt.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		DbModule,
		forwardRef(() => JwtModule),
		forwardRef(() => AuthModule), // Add AuthModule to imports
	],
	controllers: [UsersController],
})
export class UsersModule {}
