import { Module } from "@nestjs/common";
import { LoggerService } from "./logging/services/logger.service";
import { LoggingInterceptor } from "./logging/interceptors/logging.interceptor";
import { HealthController } from "./health/controller/health.controller";

@Module({
  controllers: [HealthController],
  providers: [LoggerService, LoggingInterceptor],
  exports: [LoggerService, LoggingInterceptor],
})
export class CoreModule {}
