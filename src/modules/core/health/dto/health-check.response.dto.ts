import { ApiProperty } from "@nestjs/swagger";

class ServiceStatusDto {
  @ApiProperty({ enum: ["healthy", "unhealthy"], example: "healthy" })
  status!: "healthy" | "unhealthy";

  @ApiProperty({
    example: "12 ms",
    description: "Round-trip latency to the service",
  })
  latency!: string;
}

class BackendStatusDto {
  @ApiProperty({ enum: ["healthy", "unhealthy"], example: "healthy" })
  status!: "healthy" | "unhealthy";

  @ApiProperty({ example: "1024 seconds" })
  uptime!: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ example: "API is up and running!" })
  message!: string;

  @ApiProperty({ example: "0.0.1" })
  version!: string;

  @ApiProperty({ type: ServiceStatusDto })
  database!: ServiceStatusDto;

  @ApiProperty({ type: ServiceStatusDto })
  cache!: ServiceStatusDto;

  @ApiProperty({ type: BackendStatusDto })
  backend!: BackendStatusDto;

  @ApiProperty({ example: "2026-05-06T12:34:56.000Z" })
  timestamp!: string;

  @ApiProperty({ example: "production", description: "Effective NODE_ENV" })
  mode!: string;
}
