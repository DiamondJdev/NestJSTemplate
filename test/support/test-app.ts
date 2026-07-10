import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/modules/app.module";
import { CacheService } from "../../src/modules/cache/cache.service";
import { UsersService } from "../../src/modules/db/services/users.service";
import { RefreshTokenService } from "../../src/modules/db/services/refresh-token.service";
import { JwtService } from "../../src/modules/jwt/jwt.service";
import { FakeCacheService } from "./fake-cache.service";

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
  usersService: UsersService;
  jwtService: JwtService;
  refreshTokenService: RefreshTokenService;
}

/**
 * Boots a full Nest application (the real AppModule, so every guard,
 * pipe, and route behaves exactly as in production) against the
 * template_test Postgres database, with CacheService replaced by an
 * in-memory fake. Call once per spec file's beforeAll.
 */
export async function createTestApp(): Promise<TestAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CacheService)
    .useClass(FakeCacheService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  await app.init();

  return {
    app,
    dataSource: moduleFixture.get(DataSource),
    usersService: moduleFixture.get(UsersService),
    jwtService: moduleFixture.get(JwtService),
    refreshTokenService: moduleFixture.get(RefreshTokenService),
  };
}

export async function closeTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
}
