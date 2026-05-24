import { Module, forwardRef } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { DbModule } from "../db/db.module";
import { JwtModule } from "../jwt/jwt.module";
import { CoreModule } from "../core/common.module";

@Module({
  imports: [DbModule, forwardRef(() => JwtModule), CoreModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
