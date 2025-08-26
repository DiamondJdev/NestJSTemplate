import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DbModule } from '../db/db.module';
import { BodyRequiredGuard } from './body-required.guard';

@Module({
	imports: [DbModule],
	controllers: [AuthController],
	providers: [AuthService, BodyRequiredGuard],
})
export class AuthModule {}
