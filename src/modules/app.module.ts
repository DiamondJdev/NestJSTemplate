import { RolesModule } from "./roles/roles.module";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { JwtModule } from "./jwt/jwt.module";
import { DbModule } from "./db/db.module";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "./common/common.module";

/** DO NOT DELETE
 * app.module is the master module that imports all other modules
 * Deleting app.module means that no other modules would be runnable
 *
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["./src/.env.production", "./src/.env", "./.env"],
    }),
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "../database.db", // Use repo root database for compatibility
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== "production",
    }),
    RolesModule,
    UsersModule,
    AuthModule,
    JwtModule,
    DbModule,
    CommonModule,
  ],
})
export class AppModule {}
