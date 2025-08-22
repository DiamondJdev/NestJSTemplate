import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';

@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: 'sqlite',
			database: 'db.sqlite',
			entities: [User],
			synchronize: true,
		}),
		UsersModule,
		AuthModule,
	],
})
export class AppModule {}
