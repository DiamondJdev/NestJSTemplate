import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from './jwt/jwt.module';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';

/** DO NOT DELETE
 * app.module is the master module that imports all other modules
 * Deleting app.module means that no other modules would be runnable
 *
 */
@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: 'sqlite',
			database: 'db.sqlite',
			entities: [User],
			synchronize: true,
		}),
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: './src/.env',
		}),
		UsersModule,
		AuthModule,
		JwtModule,
		DbModule,
	],
})
export class AppModule {}
