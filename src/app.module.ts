import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { JwtController } from './jwt/jwt.controller';
import { JwtService } from './jwt/jwt.service';

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
	controllers: [JwtController],
	providers: [JwtService],
})
export class AppModule {}
