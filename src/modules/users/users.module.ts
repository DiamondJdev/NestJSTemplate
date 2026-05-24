import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { DbModule } from "../db/db.module";
import { JwtModule } from "../jwt/jwt.module";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [
    DbModule,
    JwtModule,
    AuthModule,
    RolesModule,
  ],
  controllers: [UsersController],
})
export class UsersModule {}
