import { RolesModule } from "./roles/roles.module";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "./users/users.module";
import { User } from "./entities/user.entity";
import { AuthModule } from "./auth/auth.module";
import { JwtModule } from "./jwt/jwt.module";
import { DbModule } from "./db/db.module";
import { ConfigModule } from "@nestjs/config";

/** DO NOT DELETE
 * app.module is the master module that imports all other modules
 * Deleting app.module means that no other modules would be runnable
 *
 */
@Module({
  imports: [
    RolesModule,
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "../database.db", // Use repo root database for compatibility
      entities: [User],
      synchronize: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Allow dynamic resolution: prefer process.env already injected by Docker, fallback to file
      envFilePath: [
        process.env.NODE_ENV ? `./src/.env.${process.env.NODE_ENV}` : "",
        "./src/.env",
      ].filter(Boolean),
    }),
    UsersModule,
    AuthModule,
    JwtModule,
    DbModule,
  ],
})
export class AppModule {}
