import { Module } from "@nestjs/common";
import { JwtModuleOptions, JwtModule as NestJwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtService } from "./jwt.service";
import type { StringValue } from "ms";

@Module({
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.getOrThrow<string>("JWT_SECRET");
        const accessExp = configService.getOrThrow<string>("JWT_ACCESS_EXP");

        return {
          secret,
          signOptions: {
            algorithm: "HS256",
            expiresIn: accessExp as StringValue,
          },
        };
      },
    }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
