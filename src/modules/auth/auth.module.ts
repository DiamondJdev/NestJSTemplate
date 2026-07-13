import { Module, forwardRef } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { DbModule } from "../db/db.module";
import { JwtModule } from "../jwt/jwt.module";
import { CoreModule } from "../core/core.module";

@Module({
  imports: [DbModule, forwardRef(() => JwtModule), CoreModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
