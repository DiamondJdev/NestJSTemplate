import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./modules/app.module";
import { ValidationPipe } from "@nestjs/common";
import { LoggerService } from "./modules/core/logging/services/logger.service";
import { LoggingInterceptor } from "./modules/core/logging/interceptors/logging.interceptor";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // This somehow works idk
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  app.getHttpAdapter().getInstance().set('trust proxy', true); // Enable if behind a reverse proxy (e.g., for correct client IP logging)
  const configService = app.get<ConfigService>(ConfigService);
  const logger = app.get<LoggerService>(LoggerService);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  logger.log("\n\nApplication starting...", "Bootstrap");

  /**
   * Enable cookie parsing middleware to read HttpOnly cookies for authentication.
   * The JwtAuthGuard extracts tokens from both the Authorization header and the accessToken cookie.
   * CORS must also allow credentials for cookies to be sent from the frontend.
   */
  app.use(cookieParser());

  /**
   * Helmet sets security-related HTTP headers.
   * CSP is relaxed slightly to allow Swagger UI to render in any environment.
   * Tighten the CSP directives to match actual frontend requirements before deploying.
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "no-referrer" },
    }),
  );

  const allowedOriginsEnv = configService.getOrThrow<string>("ALLOWED_ORIGINS");
  app.enableCors({
    origin: allowedOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Backend API")
    .setDescription(
      "REST API.\n\n" +
        "**Authentication:** Authenticated endpoints accept either an `Authorization: Bearer <jwt>` header " +
        "or an HttpOnly `accessToken` cookie. The Swagger UI **Authorize** dialog accepts the bearer token; " +
        "browser clients automatically send the cookie when CORS credentials are enabled.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 5200;
  const ip = "0.0.0.0";
  await app.listen(port, ip);
  logger.log(`Server running on http://${ip}:${port}`, "Bootstrap");
  logger.log(`Swagger docs available at http://${ip}:${port}/api`, "Bootstrap");
}

bootstrap().catch((err: unknown) => {
  const logger = new LoggerService();
  const stack = err instanceof Error ? err.stack : "Unknown error";
  logger.error("Fatal error during bootstrap", stack, "Bootstrap");
  process.exit(1);
});
