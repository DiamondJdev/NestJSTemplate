import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../core/entities/user.entity";
import { UsersService } from "./services/users.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { DbHealthService } from "./services/db-health.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, RefreshTokenService, DbHealthService],
  exports: [UsersService, RefreshTokenService, DbHealthService],
})
export class DbModule {}
