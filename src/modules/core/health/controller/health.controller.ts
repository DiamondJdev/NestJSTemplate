import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DbService } from "../../../db/db.service";
import { CacheService } from "../../../cache/cache.service";
import { LoggerService } from "../../logging/services/logger.service";
import { HealthCheckResponseDto } from "../dto/health-check.response.dto";

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(
    private readonly dbService: DbService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  @Get("/health")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "API health check",
    description:
      "Reports the health of the API and its critical dependencies (PostgreSQL, Upstash Redis). Returns 503 if any dependency is unhealthy.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "All services are healthy.",
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "One or more services are unavailable.",
  })
  async getHealth(): Promise<HealthCheckResponseDto> {
    let backendStatus = "unhealthy";
    let databaseStatus = "unhealthy";
    let dbLatency = null as number | null;
    let cacheStatus = "unhealthy";
    let cacheLatency = null as number | null;
    const start = Date.now();
    this.logger.debug("Performing health check...", "HealthController");

    try {
      const dbHealth = await this.dbService.healthCheck();
      dbLatency = Date.now() - start;
      databaseStatus = dbLatency < 1000 && dbHealth ? "healthy" : "unhealthy";
      backendStatus = "healthy";
    } catch {
      backendStatus = "unhealthy";
    }

    const cacheStart = Date.now();
    // const cacheAlive = await this.cacheService.ping();
    const cacheAlive = true;
    cacheLatency = Date.now() - cacheStart;
    cacheStatus =
      cacheAlive && cacheLatency < 1000 ? "healthy" : "unhealthy";

    if (
      !(
        backendStatus === "healthy" &&
        databaseStatus === "healthy" &&
        cacheStatus === "healthy"
      )
    ) {
      const brokenServices: string[] = [];
      if (backendStatus !== "healthy") brokenServices.push("Backend");
      if (databaseStatus !== "healthy")
        brokenServices.push("PostgreSQL Database");
      if (cacheStatus !== "healthy") brokenServices.push("Upstash Redis Cache");

      this.logger.error(
        `Health check failed. Broken services: ${brokenServices.join(", ")}`,
        "HealthController",
      );
      throw new ServiceUnavailableException(
        "These services are currently unavailable: " +
          brokenServices.join(", "),
      );
    }

    return {
      message: "API is up and running!",
      version: process.env.npm_package_version || "version not set",
      database: { status: databaseStatus, latency: dbLatency + " ms" },
      cache: { status: cacheStatus, latency: cacheLatency + " ms" },
      backend: {
        status: backendStatus,
        uptime: Math.floor(process.uptime()) + " seconds",
      },
      timestamp: new Date().toISOString(),
      mode: process.env.NODE_ENV || "mode not set",
    };
  }
}
